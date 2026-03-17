import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHero } from "@/components/page-hero";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Clock, CheckCircle, XCircle, AlertCircle, Palmtree, CalendarDays, Pencil, ClipboardList, Eye, FileBarChart, Filter, Scissors, Trash2, X, Printer, Ban } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import type { Absence, User, Snipperdag } from "@shared/schema";
import { isAdminRole, canManageVacation } from "@shared/schema";
import { useAuth } from "@/lib/auth";
import { formatDate, formatDateShort } from "@/lib/dateUtils";

const BVVD_REASONS = [
  "Huwelijk/geregistreerd partnerschap",
  "Huwelijk bloed-/aanverwant",
  "Overlijden partner/kind/ouder",
  "Overlijden overige familie",
  "Bevalling partner",
  "Verhuizing",
  "Doktersbezoek",
  "Jubileum (25/40/50 jaar)",
  "Sollicitatieverlof",
  "Calamiteitenverlof",
  "Kort verzuimverlof",
  "Overig bijzonder verlof",
];

const absenceFormSchema = z.object({
  type: z.enum(["sick", "vacation", "personal", "other", "bvvd"]),
  startDate: z.string().min(1, "Startdatum is verplicht"),
  endDate: z.string().min(1, "Einddatum is verplicht"),
  reason: z.string().optional(),
  bvvdReason: z.string().optional(),
  halfDay: z.string().optional(),
  deductVacation: z.boolean().optional(),
}).refine((data) => {
  if (data.type === "bvvd" && !data.bvvdReason) return false;
  return true;
}, { message: "BVVD reden is verplicht", path: ["bvvdReason"] });

type VacationBalance = {
  userId: string;
  userName: string;
  department: string;
  recht: number;
  saldoOud: number;
  totalDays: number;
  geplandDays: number;
  toegekendDays: number;
  opgenomenDays: number;
  remainingDays: number;
  sickDays: number;
  snipperdagen?: number;
  cancelDays?: number;
};

function IrregularCalendarDialog({
  open,
  onOpenChange,
  startDate,
  endDate,
  absenceType,
  userId,
  onSubmitSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  startDate: string;
  endDate: string;
  absenceType: string;
  userId: string;
  onSubmitSuccess: () => void;
}) {
  const { toast } = useToast();

  const workdays = useMemo(() => {
    if (!startDate || !endDate || startDate > endDate) return [];
    const days: string[] = [];
    const cur = new Date(startDate + "T00:00:00");
    const end = new Date(endDate + "T00:00:00");
    while (cur <= end) {
      const day = cur.getDay();
      if (day !== 0 && day !== 6) days.push(format(cur, "yyyy-MM-dd"));
      cur.setDate(cur.getDate() + 1);
    }
    return days;
  }, [startDate, endDate]);

  const [selections, setSelections] = useState<Record<string, "none" | "am" | "pm" | "full">>({});

  useEffect(() => {
    if (open) {
      const init: Record<string, "none" | "am" | "pm" | "full"> = {};
      for (const d of workdays) init[d] = "full";
      setSelections(init);
    }
  }, [open, workdays]);

  const weeks = useMemo(() => {
    const result: string[][] = [];
    let current: string[] = [];
    for (const dateStr of workdays) {
      const d = new Date(dateStr + "T00:00:00");
      if (current.length > 0 && d.getDay() === 1) {
        result.push(current);
        current = [];
      }
      current.push(dateStr);
    }
    if (current.length > 0) result.push(current);
    return result;
  }, [workdays]);

  const total = useMemo(
    () => Object.values(selections).reduce((sum, v) => sum + (v === "full" ? 1 : v === "am" || v === "pm" ? 0.5 : 0), 0),
    [selections]
  );

  const summary = useMemo(() => {
    const selected = workdays.filter(d => selections[d] && selections[d] !== "none");
    if (selected.length === 0) return "";
    const lines = selected.map(dateStr => {
      const d = new Date(dateStr + "T00:00:00");
      const dayLabel = format(d, "EEEE d MMM", { locale: nl });
      const sel = selections[dateStr];
      const partLabel = sel === "am" ? "Ochtend (AM)" : sel === "pm" ? "Middag (PM)" : "Hele dag";
      return `${dayLabel}: ${partLabel}`;
    });
    return `Onregelmatig verlof (${total} dag${total !== 1 ? "en" : ""}):\n${lines.join("\n")}`;
  }, [workdays, selections, total]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const selected = workdays.filter(d => selections[d] !== "none");
      for (const dateStr of selected) {
        const sel = selections[dateStr];
        await apiRequest("POST", "/api/absences", {
          userId,
          type: absenceType,
          startDate: dateStr,
          endDate: dateStr,
          halfDay: sel === "full" ? null : sel,
          status: "pending",
          reason: summary,
          bvvdReason: null,
          approvedBy: null,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/absences"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vacation-balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: `${total} dag(en) ingediend` });
      onOpenChange(false);
      onSubmitSuccess();
    },
    onError: () => {
      toast({ title: "Fout bij indienen", variant: "destructive" });
    },
  });

  const DAYS = ["ma", "di", "wo", "do", "vr"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Onregelmatig verlof plannen
          </DialogTitle>
        </DialogHeader>

        {workdays.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            Vul een geldige periode in het verzoekformulier in.
          </p>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Selecteer per werkdag of u de ochtend (AM), middag (PM), hele dag of geen dag wilt aanvragen.
            </p>

            <div className="space-y-2">
              <div className="grid grid-cols-5 gap-1 px-1">
                {DAYS.map(d => (
                  <div key={d} className="text-xs font-medium text-center text-muted-foreground uppercase tracking-wide">{d}</div>
                ))}
              </div>

              {weeks.map((week, wi) => (
                <div key={wi} className="grid grid-cols-5 gap-1">
                  {[1, 2, 3, 4, 5].map(dayOfWeek => {
                    const dateStr = week.find(s => new Date(s + "T00:00:00").getDay() === dayOfWeek);
                    if (!dateStr) {
                      return <div key={dayOfWeek} className="rounded-md bg-muted/20 h-24" />;
                    }
                    const sel = selections[dateStr] || "full";
                    const dateObj = new Date(dateStr + "T00:00:00");
                    return (
                      <div key={dayOfWeek} className="rounded-md border p-2 space-y-1.5">
                        <div className="text-xs font-semibold text-center">
                          {format(dateObj, "d MMM", { locale: nl })}
                        </div>
                        <div className="grid grid-cols-2 gap-0.5">
                          {(["am", "pm", "full", "none"] as const).map(opt => (
                            <button
                              key={opt}
                              type="button"
                              onClick={() => setSelections(prev => ({ ...prev, [dateStr]: opt }))}
                              className={`text-xs py-1 rounded transition-colors font-medium ${
                                sel === opt
                                  ? opt === "none"
                                    ? "bg-muted text-muted-foreground ring-1 ring-border"
                                    : opt === "full"
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-blue-500 text-white"
                                  : "bg-muted/40 hover:bg-muted text-muted-foreground"
                              }`}
                              data-testid={`btn-day-${dateStr}-${opt}`}
                            >
                              {opt === "am" ? "AM" : opt === "pm" ? "PM" : opt === "full" ? "Dag" : "—"}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {summary && (
              <div className="pt-3 border-t space-y-1.5">
                <p className="text-sm font-medium text-muted-foreground">Toelichting</p>
                <textarea
                  readOnly
                  value={summary}
                  rows={Math.min(summary.split("\n").length + 1, 8)}
                  className="w-full rounded-md border border-input bg-muted/40 px-3 py-2 text-sm font-mono leading-relaxed resize-none focus:outline-none"
                  data-testid="text-irregular-summary"
                />
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t">
              <p className="text-sm font-medium">
                Totaal:{" "}
                <span className="text-primary font-semibold">{total}</span>{" "}
                dag{total !== 1 ? "en" : ""} aangevraagd
              </p>
              <Button
                onClick={() => submitMutation.mutate()}
                disabled={submitMutation.isPending || total === 0}
                data-testid="button-submit-irregular"
              >
                {submitMutation.isPending ? "Indienen..." : "Indienen"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function AbsenceReportDialog({
  open,
  onOpenChange,
  absences,
  users,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  absences: (Absence & { userName?: string; userDepartment?: string })[];
  users: User[];
}) {
  const today = new Date();
  const firstOfMonth = format(new Date(today.getFullYear(), today.getMonth(), 1), "yyyy-MM-dd");
  const lastOfMonth = format(new Date(today.getFullYear(), today.getMonth() + 1, 0), "yyyy-MM-dd");

  const [filterDept, setFilterDept] = useState<string>("all");
  const [filterEmployee, setFilterEmployee] = useState<string>("all");
  const [filterStart, setFilterStart] = useState(firstOfMonth);
  const [filterEnd, setFilterEnd] = useState(lastOfMonth);

  const typeLabels: Record<string, string> = {
    sick: "Ziekte",
    vacation: "Vakantie",
    personal: "Geoorloofd",
    other: "Ongeoorloofd",
    bvvd: "BVVD",
  };

  const statusLabels: Record<string, string> = {
    pending: "In afwachting",
    approved: "Goedgekeurd",
    rejected: "Afgewezen",
    cancelled: "Gecanceld",
  };

  const [filterType, setFilterType] = useState<string>("all");

  const departments = Array.from(new Set([
    ...users.filter(u => u.active && u.department).map(u => u.department!),
    ...absences.map(a => (a as any).userDepartment).filter(Boolean),
  ])).sort((a, b) => a.localeCompare(b, "nl"));

  const employeeOptions = users
    .filter(u => u.active && (filterDept === "all" || u.department === filterDept))
    .sort((a, b) => (a.fullName || "").localeCompare(b.fullName || "", "nl"));

  const handleDeptChange = (val: string) => {
    setFilterDept(val);
    setFilterEmployee("all");
  };

  const validRange = !filterStart || !filterEnd || filterStart <= filterEnd;

  const filtered = !validRange ? [] : absences.filter(a => {
    if (filterDept !== "all" && (a as any).userDepartment !== filterDept) return false;
    if (filterEmployee !== "all" && String(a.userId) !== filterEmployee) return false;
    if (filterType !== "all" && a.type !== filterType) return false;
    if (filterStart && a.endDate < filterStart) return false;
    if (filterEnd && a.startDate > filterEnd) return false;
    return true;
  });

  const grouped: Record<string, typeof filtered> = {};
  for (const a of filtered) {
    const dept = (a as any).userDepartment || "Geen afdeling";
    if (!grouped[dept]) grouped[dept] = [];
    grouped[dept].push(a);
  }

  const sortedDepts = Object.keys(grouped).sort((a, b) => a.localeCompare(b, "nl"));

  const countBusinessDays = (start: string, end: string, halfDay?: string | null) => {
    let count = 0;
    const s = new Date(start + "T00:00:00");
    const e = new Date(end + "T00:00:00");
    const cur = new Date(s);
    while (cur <= e) {
      const day = cur.getDay();
      if (day !== 0 && day !== 6) count++;
      cur.setDate(cur.getDate() + 1);
    }
    if ((halfDay === "am" || halfDay === "pm") && count > 0) {
      return 0.5;
    }
    return count;
  };

  const totalDays = filtered.reduce((sum, a) => sum + countBusinessDays(a.startDate, a.endDate, a.halfDay), 0);

  const handlePrint = () => {
    const typeLabelsLocal: Record<string, string> = { sick: "Ziekte", vacation: "Vakantie", personal: "Geoorloofd", other: "Ongeoorloofd", bvvd: "BVVD" };
    const statusLabelsLocal: Record<string, string> = { pending: "In afwachting", approved: "Goedgekeurd", rejected: "Afgewezen", cancelled: "Gecanceld" };

    const periodLabel = filterStart && filterEnd
      ? `${formatDate(filterStart)} – ${formatDate(filterEnd)}`
      : filterStart ? `Vanaf ${formatDate(filterStart)}` : filterEnd ? `Tot ${formatDate(filterEnd)}` : "Alle periodes";
    const deptLabel = filterDept === "all" ? "Alle afdelingen" : filterDept;
    const empLabel = filterEmployee !== "all" ? (users.find(u => String(u.id) === filterEmployee)?.fullName || "Medewerker") : "Alle medewerkers";

    const rows = sortedDepts.flatMap(dept => {
      const deptRows = [...grouped[dept]]
        .sort((a, b) => ((a as any).userName || "").localeCompare((b as any).userName || "", "nl") || a.startDate.localeCompare(b.startDate))
        .map(a => {
          const days = countBusinessDays(a.startDate, a.endDate, a.halfDay);
          const reason = a.type === "bvvd" && a.bvvdReason
            ? a.bvvdReason + (a.reason ? ` - ${a.reason}` : "")
            : a.reason || "-";
          const halfDayLabel = a.halfDay === "am" ? " (Ochtend)" : a.halfDay === "pm" ? " (Middag)" : "";
          const statusColor = a.status === "approved" ? "#16a34a" : a.status === "rejected" ? "#dc2626" : a.status === "cancelled" ? "#ea580c" : "#6b7280";
          return `<tr>
            <td style="padding:5px 8px;border-bottom:1px solid #e5e7eb;padding-left:20px">${(a as any).userName || "Medewerker"}</td>
            <td style="padding:5px 8px;border-bottom:1px solid #e5e7eb">${typeLabelsLocal[a.type] || a.type}</td>
            <td style="padding:5px 8px;border-bottom:1px solid #e5e7eb;white-space:nowrap">${formatDateShort(a.startDate)} – ${formatDate(a.endDate)}${halfDayLabel}</td>
            <td style="padding:5px 8px;border-bottom:1px solid #e5e7eb;text-align:right">${days}</td>
            <td style="padding:5px 8px;border-bottom:1px solid #e5e7eb;max-width:220px;word-wrap:break-word">${reason}</td>
            <td style="padding:5px 8px;border-bottom:1px solid #e5e7eb;color:${statusColor};font-weight:600">${statusLabelsLocal[a.status] || a.status}</td>
          </tr>`;
        }).join("");
      return `<tr><td colspan="6" style="padding:6px 8px;background:#f3f4f6;font-weight:700;font-size:13px;border-bottom:1px solid #d1d5db">${dept} (${grouped[dept].length} meldingen)</td></tr>${deptRows}`;
    }).join("");

    const html = `<!DOCTYPE html>
<html lang="nl">
<head>
  <meta charset="utf-8"/>
  <title>Afwezigheidsrapport</title>
  <style>
    @page { margin: 1.5cm; size: A4; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #111; background: white; }
    h1 { font-size: 18px; margin: 0 0 4px 0; }
    .meta { font-size: 11px; color: #555; margin-bottom: 16px; display: flex; gap: 24px; flex-wrap: wrap; }
    .meta span { }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    thead th { background: #f3f4f6; padding: 7px 8px; text-align: left; border-bottom: 2px solid #d1d5db; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #374151; }
    thead th:nth-child(4) { text-align: right; }
    .summary { margin-top: 16px; font-size: 12px; border-top: 2px solid #d1d5db; padding-top: 10px; display: flex; gap: 24px; }
    .summary strong { font-size: 14px; }
  </style>
</head>
<body>
  <h1>Afwezigheidsrapport</h1>
  <div class="meta">
    <span><b>Periode:</b> ${periodLabel}</span>
    <span><b>Afdeling:</b> ${deptLabel}</span>
    <span><b>Medewerker:</b> ${empLabel}</span>
    <span><b>Afgedrukt:</b> ${format(new Date(), "dd-MM-yyyy HH:mm")}</span>
  </div>
  <table>
    <thead>
      <tr>
        <th>Medewerker</th><th>Type</th><th>Periode</th><th>Dagen</th><th>Reden</th><th>Status</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="summary">
    <span>Totaal meldingen: <strong>${filtered.length}</strong></span>
    <span>Totaal werkdagen: <strong>${totalDays}</strong></span>
  </div>
</body>
</html>`;

    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="flex items-center gap-2">
              <FileBarChart className="h-5 w-5" />
              Afwezigheidsrapport
              {filterEmployee !== "all" && (() => {
                const emp = users.find(u => String(u.id) === filterEmployee);
                return emp ? <span className="font-normal text-muted-foreground">— {emp.fullName || emp.username}</span> : null;
              })()}
            </DialogTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              disabled={filtered.length === 0}
              className="gap-2 shrink-0"
              data-testid="button-print-report"
            >
              <Printer className="h-4 w-4" />
              Afdrukken
            </Button>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="space-y-1">
            <label className="text-sm font-medium flex items-center gap-1">
              <Filter className="h-3.5 w-3.5" />
              Afdeling
            </label>
            <Select value={filterDept} onValueChange={handleDeptChange}>
              <SelectTrigger data-testid="select-report-department">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle afdelingen</SelectItem>
                {departments.map(d => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Medewerker</label>
            <Select value={filterEmployee} onValueChange={setFilterEmployee}>
              <SelectTrigger data-testid="select-report-employee">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle medewerkers</SelectItem>
                {employeeOptions.map(u => (
                  <SelectItem key={u.id} value={String(u.id)}>{u.fullName || u.username}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Type</label>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger data-testid="select-report-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle types</SelectItem>
                <SelectItem value="sick">Ziekte</SelectItem>
                <SelectItem value="vacation">Vakantie</SelectItem>
                <SelectItem value="personal">Geoorloofd</SelectItem>
                <SelectItem value="other">Ongeoorloofd</SelectItem>
                <SelectItem value="bvvd">BVVD</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Van</label>
            <Input
              type="date"
              value={filterStart}
              onChange={e => setFilterStart(e.target.value)}
              className="cursor-pointer"
              data-testid="input-report-start"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Tot</label>
            <Input
              type="date"
              value={filterEnd}
              onChange={e => setFilterEnd(e.target.value)}
              className="cursor-pointer"
              data-testid="input-report-end"
            />
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground border-b pb-2">
          {!validRange ? (
            <span className="text-destructive">Ongeldige periode: startdatum moet voor einddatum liggen</span>
          ) : (
            <>
              <span>Resultaten: <strong className="text-foreground">{filtered.length}</strong> meldingen</span>
              <span>Totaal: <strong className="text-foreground">{totalDays}</strong> werkdagen</span>
            </>
          )}
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-8">
            <FileBarChart className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground text-sm">Geen afwezigheden gevonden in deze periode</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Medewerker</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Periode</TableHead>
                  <TableHead className="text-right">Dagen</TableHead>
                  <TableHead>Reden</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedDepts.map(dept => (
                  <>
                    <TableRow key={`dept-${dept}`}>
                      <TableCell colSpan={6} className="bg-muted/50 font-bold text-sm py-1.5">
                        {dept} ({grouped[dept].length} meldingen)
                      </TableCell>
                    </TableRow>
                    {[...grouped[dept]]
                      .sort((a, b) => ((a as any).userName || "").localeCompare((b as any).userName || "", "nl") || a.startDate.localeCompare(b.startDate))
                      .map(absence => {
                        const days = countBusinessDays(absence.startDate, absence.endDate, absence.halfDay);
                        const displayReason = absence.type === "bvvd" && absence.bvvdReason
                          ? absence.bvvdReason + (absence.reason ? ` - ${absence.reason}` : "")
                          : absence.reason || "-";
                        return (
                          <TableRow key={absence.id} data-testid={`row-report-${absence.id}`}>
                            <TableCell className="font-medium text-sm pl-6">
                              {(absence as any).userName || "Medewerker"}
                            </TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="text-xs">{typeLabels[absence.type]}</Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                              {formatDateShort(absence.startDate)} - {formatDate(absence.endDate)}
                              {absence.halfDay === "am" && <Badge variant="outline" className="ml-1 text-xs">Ochtend</Badge>}
                              {absence.halfDay === "pm" && <Badge variant="outline" className="ml-1 text-xs">Middag</Badge>}
                            </TableCell>
                            <TableCell className="text-right text-sm">{days}</TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-40 truncate">
                              {displayReason}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={absence.status === "approved" ? "default" : absence.status === "rejected" ? "destructive" : "secondary"}
                                className={`text-xs ${absence.status === "cancelled" ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" : absence.status === "pending" ? "bg-background border" : ""}`}
                              >
                                {absence.status === "cancelled" && <Ban className="h-3 w-3 mr-1" />}
                                {statusLabels[absence.status] || absence.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CancelVerzuimTab({ allUsers, currentUser }: { allUsers: User[]; currentUser: User }) {
  const [selectedDept, setSelectedDept] = useState<string>("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [confirmAbsence, setConfirmAbsence] = useState<Absence | null>(null);
  const { toast } = useToast();

  const year = new Date().getFullYear();
  const today = new Date().toISOString().split("T")[0];

  const departments = [...new Set(
    allUsers.filter(u => u.active).map(u => u.department || "Geen afdeling")
  )].sort((a, b) => a.localeCompare(b, "nl"));

  const usersInDept = allUsers
    .filter(u => u.active && (u.department || "Geen afdeling") === selectedDept)
    .sort((a, b) => a.fullName.localeCompare(b.fullName, "nl"));

  const { data: userAbsences, isLoading: loadingAbsences } = useQuery<Absence[]>({
    queryKey: ["/api/absences/user", selectedUserId],
    enabled: !!selectedUserId,
  });

  const dateToAbsence = useMemo(() => {
    const map: Record<string, Absence> = {};
    for (const abs of userAbsences || []) {
      const start = new Date(abs.startDate + "T00:00:00");
      const end = new Date(abs.endDate + "T00:00:00");
      const cur = new Date(start);
      while (cur <= end) {
        const dow = cur.getDay();
        if (dow !== 0 && dow !== 6) {
          map[cur.toISOString().split("T")[0]] = abs;
        }
        cur.setDate(cur.getDate() + 1);
      }
    }
    return map;
  }, [userAbsences]);

  const cancelMutation = useMutation({
    mutationFn: async (absenceId: string) => {
      const res = await apiRequest("POST", `/api/absences/${absenceId}/cancel`);
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/absences"] });
      queryClient.invalidateQueries({ queryKey: ["/api/absences/user", selectedUserId] });
      queryClient.invalidateQueries({ queryKey: ["/api/vacation-balance"] });
      if (data.takenDays > 0) {
        toast({ title: `Verlof gecanceld — ${data.takenDays} dag(en) teruggeboekt op saldo` });
      } else {
        toast({ title: "Gepland verlof gecanceld" });
      }
      setConfirmAbsence(null);
    },
    onError: (err: any) => {
      toast({ title: err.message || "Annuleren mislukt", variant: "destructive" });
    },
  });

  const renderMonth = (monthIndex: number) => {
    const firstDay = new Date(year, monthIndex, 1);
    const lastDay = new Date(year, monthIndex + 1, 0);
    let startDow = firstDay.getDay();
    if (startDow === 0) startDow = 7;
    const paddingDays = startDow - 1;

    const monthName = firstDay.toLocaleDateString("nl-NL", { month: "long", year: "numeric" });

    const days: (Date | null)[] = [];
    for (let i = 0; i < paddingDays; i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, monthIndex, d));

    const hasVacation = days.some(d => d && dateToAbsence[d.toISOString().split("T")[0]]);

    return (
      <div key={monthIndex} className={`border rounded-lg p-3 space-y-2 ${hasVacation ? "border-primary/30 bg-primary/5" : ""}`}>
        <p className="text-xs font-semibold capitalize text-center text-muted-foreground">{monthName}</p>
        <div className="grid grid-cols-7 gap-0.5 text-center text-[10px] text-muted-foreground mb-0.5">
          {["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"].map(d => <span key={d}>{d}</span>)}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {days.map((date, i) => {
            if (!date) return <span key={`pad-${monthIndex}-${i}`} />;
            const dateStr = date.toISOString().split("T")[0];
            const dow = date.getDay();
            const isWeekend = dow === 0 || dow === 6;
            const absence = dateToAbsence[dateStr];
            const isPast = dateStr < today;

            let cellClass = "h-6 w-6 mx-auto flex items-center justify-center rounded text-[11px] select-none";
            const isHalfDay = absence && (absence.halfDay === "am" || absence.halfDay === "pm");

            if (absence) {
              if (absence.status === "pending") {
                cellClass += " bg-yellow-200 text-yellow-900 dark:bg-yellow-800/50 dark:text-yellow-200 cursor-pointer hover:bg-yellow-300 font-semibold";
              } else if (absence.status === "approved" && isPast) {
                cellClass += " bg-blue-200 text-blue-900 dark:bg-blue-800/50 dark:text-blue-200 cursor-pointer hover:bg-blue-300 font-semibold";
              } else {
                cellClass += " bg-green-200 text-green-900 dark:bg-green-800/50 dark:text-green-200 cursor-pointer hover:bg-green-300 font-semibold";
              }
            } else if (isWeekend) {
              cellClass += " text-muted-foreground/40";
            } else {
              cellClass += " text-foreground/70";
            }

            const halfLabel = isHalfDay ? (absence.halfDay === "am" ? " (ochtend)" : " (middag)") : "";
            const titleText = absence
              ? (absence.status === "pending" ? `Gepland${halfLabel} — klik om te cancelen` : isPast ? `Opgenomen${halfLabel} — klik om te cancelen` : `Toegekend${halfLabel} — klik om te cancelen`)
              : undefined;

            return (
              <div
                key={dateStr}
                className={`${cellClass} relative`}
                title={titleText}
                onClick={absence ? () => setConfirmAbsence(absence) : undefined}
                data-testid={absence ? `day-cancel-${dateStr}` : undefined}
              >
                {date.getDate()}
                {isHalfDay && (
                  <span className="absolute -top-0.5 -right-0.5 text-[7px] leading-none font-bold">½</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-4 flex-wrap items-end">
        <div className="space-y-1">
          <label className="text-sm font-medium">Afdeling</label>
          <Select value={selectedDept} onValueChange={(v) => { setSelectedDept(v); setSelectedUserId(""); }}>
            <SelectTrigger className="w-52" data-testid="select-cancel-dept">
              <SelectValue placeholder="Kies afdeling…" />
            </SelectTrigger>
            <SelectContent>
              {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        {selectedDept && (
          <div className="space-y-1">
            <label className="text-sm font-medium">Medewerker</label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="w-52" data-testid="select-cancel-user">
                <SelectValue placeholder="Kies medewerker…" />
              </SelectTrigger>
              <SelectContent>
                {usersInDept.map(u => <SelectItem key={u.id} value={u.id}>{u.fullName}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {selectedUserId && (
        <div className="flex gap-4 text-xs text-muted-foreground flex-wrap items-center">
          <span className="font-medium">Legenda:</span>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-yellow-200 border border-yellow-400" />
            Gepland (pending)
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-green-200 border border-green-400" />
            Toegekend (toekomst)
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-blue-200 border border-blue-400" />
            Opgenomen (verleden)
          </div>
          <span className="text-muted-foreground/60">— klik op een dag om verlof te cancelen</span>
        </div>
      )}

      {selectedUserId && (
        loadingAbsences ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 12 }, (_, i) => renderMonth(i))}
          </div>
        )
      )}

      {!selectedUserId && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <CalendarDays className="h-12 w-12 mb-3 opacity-25" />
          <p className="text-sm">Selecteer een afdeling en medewerker om de verlofkalender te tonen</p>
        </div>
      )}

      {confirmAbsence && (
        <Dialog open={!!confirmAbsence} onOpenChange={() => setConfirmAbsence(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Verlofperiode cancelen</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <p>
                <span className="text-muted-foreground">Periode: </span>
                <strong>{formatDate(confirmAbsence.startDate)}</strong>
                {confirmAbsence.startDate !== confirmAbsence.endDate && (
                  <> t/m <strong>{formatDate(confirmAbsence.endDate)}</strong></>
                )}
              </p>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-sm">Status: </span>
                <Badge variant={confirmAbsence.status === "pending" ? "outline" : "default"} className="text-xs">
                  {confirmAbsence.status === "pending" ? "Gepland" : "Goedgekeurd"}
                </Badge>
                {(confirmAbsence.halfDay === "am" || confirmAbsence.halfDay === "pm") && (
                  <Badge variant="secondary" className="text-xs">
                    Halve dag ({confirmAbsence.halfDay === "am" ? "ochtend" : "middag"})
                  </Badge>
                )}
              </div>
              {confirmAbsence.status === "approved" && confirmAbsence.startDate <= today ? (
                <p className="text-amber-600 dark:text-amber-400">
                  Een deel van dit verlof is al opgenomen. De opgenomen dagen worden teruggeboekt op het vakantiesaldo en zichtbaar in de kolom "Cancel".
                </p>
              ) : (
                <p className="text-muted-foreground">
                  Dit verlof was nog niet opgenomen. Annuleren heeft geen effect op het vakantiesaldo.
                </p>
              )}
            </div>
            <div className="flex gap-2 justify-end mt-2">
              <Button variant="outline" onClick={() => setConfirmAbsence(null)}>Sluiten</Button>
              <Button
                variant="destructive"
                disabled={cancelMutation.isPending}
                onClick={() => cancelMutation.mutate(confirmAbsence.id)}
                data-testid="button-confirm-cancel"
              >
                <XCircle className="h-4 w-4 mr-1.5" />
                {cancelMutation.isPending ? "Bezig…" : "Verlof cancelen"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

export default function VerzuimPage() {
  const [open, setOpen] = useState(false);
  const [irregularOpen, setIrregularOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [snipperdagOpen, setSnipperdagOpen] = useState(false);
  const [snipperdagName, setSnipperdagName] = useState("");
  const [snipperdagDate, setSnipperdagDate] = useState("");
  const [rechtOpen, setRechtOpen] = useState(false);
  const [selectedAbsences, setSelectedAbsences] = useState<Set<string>>(new Set());
  const [editingUser, setEditingUser] = useState<{ id: string; name: string; days: number } | null>(null);
  const [newDays, setNewDays] = useState("");
  const [editingSaldoOud, setEditingSaldoOud] = useState<{ id: string; name: string; days: number } | null>(null);
  const [newSaldoOud, setNewSaldoOud] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: absences, isLoading } = useQuery<(Absence & { userName?: string; userDepartment?: string })[]>({
    queryKey: ["/api/absences"],
  });

  const { data: allUsers } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: snipperdagenData } = useQuery<Snipperdag[]>({
    queryKey: ["/api/snipperdagen"],
  });

  const { data: vacationBalances, isLoading: loadingBalances } = useQuery<VacationBalance[]>({
    queryKey: ["/api/vacation-balance"],
  });

  const form = useForm<z.infer<typeof absenceFormSchema>>({
    resolver: zodResolver(absenceFormSchema),
    defaultValues: { type: "sick", startDate: "", endDate: "", reason: "", bvvdReason: "", halfDay: "", deductVacation: false },
  });

  const watchType = form.watch("type");
  const watchStartDate = form.watch("startDate");
  const watchEndDate = form.watch("endDate");
  const [dateFocused, setDateFocused] = useState(false);
  const [activeTab, setActiveTab] = useState("meldingen");

  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof absenceFormSchema>) => {
      await apiRequest("POST", "/api/absences", {
        ...data,
        userId: user?.id,
        reason: data.reason || null,
        bvvdReason: data.type === "bvvd" ? data.bvvdReason : null,
        halfDay: (data.halfDay && data.halfDay !== "full") ? data.halfDay : null,
        status: "pending",
        approvedBy: null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/absences"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vacation-balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Verzuimmelding ingediend" });
      setOpen(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Fout bij indienen", variant: "destructive" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await apiRequest("PATCH", `/api/absences/${id}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/absences"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vacation-balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Status bijgewerkt" });
    },
    onError: () => {
      toast({ title: "Geen rechten voor deze actie", variant: "destructive" });
    },
  });

  const bulkApproveMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) {
        await apiRequest("PATCH", `/api/absences/${id}`, { status: "approved" });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/absences"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vacation-balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setSelectedAbsences(new Set());
      toast({ title: `${selectedAbsences.size} verzoek(en) goedgekeurd` });
    },
    onError: () => {
      toast({ title: "Fout bij goedkeuren", variant: "destructive" });
    },
  });

  const createSnipperdagMutation = useMutation({
    mutationFn: async (data: { name: string; date: string }) => {
      await apiRequest("POST", "/api/snipperdagen", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/snipperdagen"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vacation-balance"] });
      toast({ title: "Snipperdag toegevoegd" });
      setSnipperdagName("");
      setSnipperdagDate("");
    },
    onError: () => {
      toast({ title: "Fout bij toevoegen", variant: "destructive" });
    },
  });

  const deleteSnipperdagMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/snipperdagen/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/snipperdagen"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vacation-balance"] });
      toast({ title: "Snipperdag verwijderd" });
    },
  });

  const updateVacDaysMutation = useMutation({
    mutationFn: async ({ userId, vacationDaysTotal }: { userId: string; vacationDaysTotal: number }) => {
      await apiRequest("PATCH", `/api/users/${userId}/vacation-days`, { vacationDaysTotal });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vacation-balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Vakantierecht bijgewerkt" });
      setEditingUser(null);
      setNewDays("");
    },
    onError: () => {
      toast({ title: "Fout bij bijwerken", variant: "destructive" });
    },
  });

  const updateSaldoOudMutation = useMutation({
    mutationFn: async ({ userId, vacationDaysSaldoOud }: { userId: string; vacationDaysSaldoOud: number }) => {
      await apiRequest("PATCH", `/api/users/${userId}/saldo-oud`, { vacationDaysSaldoOud });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vacation-balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Saldo oud bijgewerkt" });
      setEditingSaldoOud(null);
      setNewSaldoOud("");
    },
    onError: () => {
      toast({ title: "Fout bij bijwerken", variant: "destructive" });
    },
  });

  const typeLabels: Record<string, string> = {
    sick: "Ziekte",
    vacation: "Vakantie",
    personal: "Geoorloofd",
    other: "Ongeoorloofd",
    bvvd: "BVVD",
  };

  const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: any; className?: string }> = {
    pending: { label: "In afwachting", variant: "outline", icon: AlertCircle },
    approved: { label: "Goedgekeurd", variant: "default", icon: CheckCircle },
    rejected: { label: "Afgewezen", variant: "destructive", icon: XCircle },
    cancelled: { label: "Gecanceld", variant: "secondary", icon: Ban, className: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" },
  };

  const isAdmin = isAdminRole(user?.role);
  const isAdminOrManager = isAdminRole(user?.role) || user?.role === "manager" || user?.role === "manager_az";
  const canVacation = canManageVacation(user?.role);

  const canApprove = (absence: any) => {
    if (absence.status !== "pending" || absence.userId === user?.id) return false;
    if (user?.role === "directeur") return true;
    if (isAdminRole(user?.role) && !isAdminRole(absence.userRole) && absence.userRole !== "manager" && absence.userRole !== "manager_az") return true;
    if ((user?.role === "manager" || user?.role === "manager_az") && absence.userRole === "employee") return true;
    return false;
  };

  const myBalance = vacationBalances?.find(b => b.userId === user?.id);

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="overflow-auto h-full">
      <PageHero
        title="Verzuim"
        subtitle="Beheer verlof- en ziekmeldingen"
        imageSrc="/uploads/App_pics/verzuim.png"
        imageAlt="verzuim"
      />
      <div className="p-6 space-y-4">
      <div className="flex items-center justify-end gap-4 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          {isAdminOrManager && (
            <Button variant="outline" onClick={() => setReportOpen(true)} data-testid="button-absence-report">
              <FileBarChart className="h-4 w-4 mr-2" />
              Afwezigheidsrapport
            </Button>
          )}
          {canVacation && (
            <Button variant="outline" onClick={() => setSnipperdagOpen(true)} data-testid="button-snipperdagen">
              <Scissors className="h-4 w-4 mr-2" />
              Snipperdagen
            </Button>
          )}
          {canVacation && (
            <Button variant="outline" onClick={() => setRechtOpen(true)} data-testid="button-manage-vacation-days">
              <CalendarDays className="h-4 w-4 mr-2" />
              Vakantierecht Instellen
            </Button>
          )}
          {canVacation && (
            <Dialog open={rechtOpen} onOpenChange={(v) => { setRechtOpen(v); if (!v) { setEditingUser(null); setEditingSaldoOud(null); } }}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Vakantierecht per 1 januari {new Date().getFullYear()}</DialogTitle>
                </DialogHeader>
                <div className="overflow-x-auto max-h-96 overflow-y-auto">
                  {loadingBalances ? (
                    <Skeleton className="h-32" />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Medewerker</TableHead>
                          <TableHead className="text-right">Recht</TableHead>
                          <TableHead className="text-right">Saldo Oud</TableHead>
                          <TableHead className="text-right">Totaal</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[...(vacationBalances || [])].sort((a, b) => a.userName.localeCompare(b.userName, "nl")).map((b) => (
                          <TableRow key={b.userId} data-testid={`vacation-days-row-${b.userId}`}>
                            <TableCell className="font-medium text-sm">{b.userName}</TableCell>
                            <TableCell className="text-right">
                              {editingUser?.id === b.userId ? (
                                <div className="flex items-center justify-end gap-1">
                                  <Input
                                    type="number"
                                    min="0"
                                    value={newDays}
                                    onChange={(e) => setNewDays(e.target.value)}
                                    className="w-20 text-right"
                                    data-testid="input-vacation-days"
                                  />
                                  <Button
                                    size="sm"
                                    onClick={() => updateVacDaysMutation.mutate({ userId: b.userId, vacationDaysTotal: parseInt(newDays) || 0 })}
                                    disabled={updateVacDaysMutation.isPending}
                                    data-testid="button-save-vacation-days"
                                  >
                                    Opslaan
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => setEditingUser(null)}>
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-end gap-1">
                                  <span className="text-sm">{b.recht}</span>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6"
                                    onClick={() => { setEditingUser({ id: b.userId, name: b.userName, days: b.recht }); setNewDays(String(b.recht)); setEditingSaldoOud(null); }}
                                    data-testid={`button-edit-recht-${b.userId}`}
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {editingSaldoOud?.id === b.userId ? (
                                <div className="flex items-center justify-end gap-1">
                                  <Input
                                    type="number"
                                    min="0"
                                    value={newSaldoOud}
                                    onChange={(e) => setNewSaldoOud(e.target.value)}
                                    className="w-20 text-right"
                                    data-testid="input-saldo-oud"
                                  />
                                  <Button
                                    size="sm"
                                    onClick={() => updateSaldoOudMutation.mutate({ userId: b.userId, vacationDaysSaldoOud: parseInt(newSaldoOud) || 0 })}
                                    disabled={updateSaldoOudMutation.isPending}
                                    data-testid="button-save-saldo-oud"
                                  >
                                    Opslaan
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => setEditingSaldoOud(null)}>
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex items-center justify-end gap-1">
                                  <span className="text-sm">{b.saldoOud}</span>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6"
                                    onClick={() => { setEditingSaldoOud({ id: b.userId, name: b.userName, days: b.saldoOud }); setNewSaldoOud(String(b.saldoOud)); setEditingUser(null); }}
                                    data-testid={`button-edit-saldo-oud-${b.userId}`}
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                            <TableCell className="text-right text-sm font-medium">{b.totalDays}</TableCell>
                            <TableCell></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          )}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-absence">
                <Plus className="h-4 w-4 mr-2" />
                Nieuw Verzoek
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Verzuimmelding</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
                  <FormField control={form.control} name="type" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select onValueChange={(val) => { field.onChange(val); if (val !== "bvvd") form.setValue("bvvdReason", ""); }} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-absence-type"><SelectValue /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="sick">Ziekte</SelectItem>
                          <SelectItem value="vacation">Vakantie</SelectItem>
                          <SelectItem value="personal">Geoorloofd</SelectItem>
                          <SelectItem value="bvvd">BVVD (Bijzonder Verlof)</SelectItem>
                          <SelectItem value="other">Ongeoorloofd</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  {(watchType === "personal" || watchType === "other") && (
                    <FormField control={form.control} name="deductVacation" render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel className="text-sm">Aftrekbaar van vakantiedagen?</FormLabel>
                        </div>
                        <FormControl>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant={field.value === true ? "default" : "outline"}
                              onClick={() => field.onChange(true)}
                              data-testid="button-deduct-yes"
                            >J</Button>
                            <Button
                              type="button"
                              size="sm"
                              variant={field.value !== true ? "default" : "outline"}
                              onClick={() => field.onChange(false)}
                              data-testid="button-deduct-no"
                            >N</Button>
                          </div>
                        </FormControl>
                      </FormItem>
                    )} />
                  )}
                  {watchType === "bvvd" && (
                    <FormField control={form.control} name="bvvdReason" render={({ field }) => (
                      <FormItem>
                        <FormLabel>BVVD Reden</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-bvvd-reason"><SelectValue placeholder="Selecteer reden..." /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {BVVD_REASONS.map((reason) => (
                              <SelectItem key={reason} value={reason}>{reason}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="startDate" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Startdatum</FormLabel>
                        <FormControl><Input type="date" {...field} onClick={(e) => { try { (e.target as HTMLInputElement).showPicker(); } catch {} }} onFocus={(e) => { setDateFocused(true); try { e.target.showPicker(); } catch {} }} onBlur={(e) => { field.onBlur(); setDateFocused(false); }} className="cursor-pointer [&::-webkit-calendar-picker-indicator]:cursor-pointer" data-testid="input-absence-startdate" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="endDate" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Einddatum</FormLabel>
                        <FormControl><Input type="date" {...field} onClick={(e) => { try { (e.target as HTMLInputElement).showPicker(); } catch {} }} onFocus={(e) => { setDateFocused(true); try { e.target.showPicker(); } catch {} }} onBlur={(e) => { field.onBlur(); setDateFocused(false); }} className="cursor-pointer [&::-webkit-calendar-picker-indicator]:cursor-pointer" data-testid="input-absence-enddate" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <p className={`text-xs text-muted-foreground italic transition-opacity duration-500 ${dateFocused ? "opacity-100" : "opacity-0"}`} data-testid="text-date-hint">
                    Spatiebalk voor activeren kalender
                  </p>
                  <FormField control={form.control} name="halfDay" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dagdeel</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-half-day"><SelectValue placeholder="Hele dag" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="full">Hele dag</SelectItem>
                          <SelectItem value="am">Ochtend (AM)</SelectItem>
                          <SelectItem value="pm">Middag (PM)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="reason" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Toelichting</FormLabel>
                      <FormControl><Textarea {...field} data-testid="input-absence-reason" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 gap-2"
                      onClick={() => {
                        const sd = form.getValues("startDate");
                        const ed = form.getValues("endDate");
                        if (!sd || !ed) {
                          toast({ title: "Vul eerst een start- en einddatum in", variant: "destructive" });
                          return;
                        }
                        if (sd > ed) {
                          toast({ title: "Startdatum moet voor de einddatum liggen", variant: "destructive" });
                          return;
                        }
                        setIrregularOpen(true);
                      }}
                      data-testid="button-irregular"
                    >
                      <CalendarDays className="h-4 w-4" />
                      Onregelmatig
                    </Button>
                    <Button type="submit" className="flex-1" disabled={createMutation.isPending} data-testid="button-submit-absence">
                      {createMutation.isPending ? "Indienen..." : "Verzoek Indienen"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          <IrregularCalendarDialog
            open={irregularOpen}
            onOpenChange={setIrregularOpen}
            startDate={watchStartDate}
            endDate={watchEndDate}
            absenceType={watchType}
            userId={user?.id || ""}
            onSubmitSuccess={() => { setOpen(false); form.reset(); }}
          />
        </div>
      </div>

      <div className="flex gap-1 border-b">
        <button
          onClick={() => setActiveTab("meldingen")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "meldingen"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          data-testid="tab-meldingen"
        >
          <ClipboardList className="h-4 w-4 inline mr-1.5 -mt-0.5" />
          Meldingen
        </button>
        {isAdminOrManager && (
          <button
            onClick={() => setActiveTab("overzicht")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "overzicht"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            data-testid="tab-overzicht"
          >
            <Eye className="h-4 w-4 inline mr-1.5 -mt-0.5" />
            Overzicht
          </button>
        )}
        {isAdminOrManager && (
          <button
            onClick={() => setActiveTab("vakantiesaldo")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "vakantiesaldo"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            data-testid="tab-vakantiesaldo"
          >
            <Palmtree className="h-4 w-4 inline mr-1.5 -mt-0.5" />
            Vakantiesaldo
          </button>
        )}
        {isAdminRole(user?.role) && (
          <button
            onClick={() => setActiveTab("cancel-verzuim")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "cancel-verzuim"
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            data-testid="tab-cancel-verzuim"
          >
            <XCircle className="h-4 w-4 inline mr-1.5 -mt-0.5" />
            Cancel verzuim
          </button>
        )}
      </div>

      {activeTab === "meldingen" && (
        <div className="space-y-3">
          {myBalance && (
            <Card>
              <CardContent className="flex items-center gap-6 p-3 flex-wrap">
                <Palmtree className="h-5 w-5 text-muted-foreground" />
                <div className="text-sm">
                  <span className="text-muted-foreground">Mijn vakantiesaldo:</span>{" "}
                  <span className="font-semibold" data-testid="text-my-remaining">{myBalance.remainingDays}</span>
                  <span className="text-muted-foreground"> van {myBalance.totalDays} dagen resterend</span>
                  <span className="text-muted-foreground"> ({myBalance.opgenomenDays} opgenomen</span>
                  {myBalance.toegekendDays > myBalance.opgenomenDays && (
                    <span className="text-muted-foreground">, {myBalance.toegekendDays} toegekend</span>
                  )}
                  {myBalance.geplandDays > 0 && (
                    <span className="text-muted-foreground">, {myBalance.geplandDays} gepland</span>
                  )}
                  <span className="text-muted-foreground">)</span>
                </div>
              </CardContent>
            </Card>
          )}

          {(() => {
            const filtered = isAdminOrManager
              ? (absences || []).filter(a => a.status === "pending")
              : (absences || []);
            if (filtered.length === 0) {
              return (
                <Card>
                  <CardContent className="flex flex-col items-center py-10">
                    <Clock className="h-10 w-10 text-muted-foreground mb-3" />
                    <p className="text-muted-foreground text-sm">
                      {isAdminOrManager ? "Geen verzoeken in afwachting" : "Geen verzuimmeldingen"}
                    </p>
                  </CardContent>
                </Card>
              );
            }
            const approvableIds = filtered.filter(a => canApprove(a)).map(a => a.id);
            const allSelected = approvableIds.length > 0 && approvableIds.every(id => selectedAbsences.has(id));
            const someSelected = approvableIds.some(id => selectedAbsences.has(id));

            const toggleAll = () => {
              if (allSelected) {
                setSelectedAbsences(new Set());
              } else {
                setSelectedAbsences(new Set(approvableIds));
              }
            };

            const toggleOne = (id: string) => {
              setSelectedAbsences(prev => {
                const next = new Set(prev);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
              });
            };

            return (
              <Card>
                {isAdminOrManager && selectedAbsences.size > 0 && (
                  <div className="flex items-center gap-3 px-4 py-2 border-b bg-muted/30">
                    <span className="text-sm font-medium">{selectedAbsences.size} verzoek(en) geselecteerd</span>
                    <Button
                      size="sm"
                      onClick={() => bulkApproveMutation.mutate(Array.from(selectedAbsences))}
                      disabled={bulkApproveMutation.isPending}
                      data-testid="button-bulk-approve"
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      {bulkApproveMutation.isPending ? "Bezig..." : "Alles Goedkeuren"}
                    </Button>
                  </div>
                )}
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Medewerker</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Periode</TableHead>
                          <TableHead>Reden</TableHead>
                          <TableHead>Status</TableHead>
                          {isAdminOrManager && (
                            <TableHead>
                              <div className="flex items-center gap-2">
                                <span>Actie</span>
                                {approvableIds.length > 0 && (
                                  <Checkbox
                                    checked={allSelected ? true : someSelected ? "indeterminate" : false}
                                    onCheckedChange={toggleAll}
                                    data-testid="checkbox-select-all"
                                    aria-label="Selecteer alle verzoeken"
                                  />
                                )}
                              </div>
                            </TableHead>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(() => {
                          const sorted = [...filtered].sort((a, b) => ((a as any).userName || "").localeCompare((b as any).userName || "", "nl"));
                          const colCount = isAdminOrManager ? 6 : 5;
                          const depts = Array.from(new Set(sorted.map(a => (a as any).userDepartment || "Geen afdeling"))).sort((a, b) => a.localeCompare(b, "nl"));
                          return depts.map(dept => (
                            <>{isAdminOrManager && (
                              <TableRow key={`dept-${dept}`}>
                                <TableCell colSpan={colCount} className="bg-muted/50 font-bold text-sm py-1.5">
                                  {dept}
                                </TableCell>
                              </TableRow>
                            )}
                            {sorted.filter(a => ((a as any).userDepartment || "Geen afdeling") === dept).map((absence) => {
                              const sc = statusConfig[absence.status] || statusConfig.pending;
                              const StatusIcon = sc.icon;
                              const displayReason = absence.type === "bvvd" && absence.bvvdReason
                                ? absence.bvvdReason + (absence.reason ? ` - ${absence.reason}` : "")
                                : absence.reason || "-";
                              const isApprovable = canApprove(absence);
                              return (
                                <TableRow key={absence.id} data-testid={`row-absence-${absence.id}`}>
                                  <TableCell className={`font-medium text-sm ${isAdminOrManager ? "pl-6" : ""}`}>
                                    {(absence as any).userName || "Medewerker"}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="secondary" className="text-xs">{typeLabels[absence.type]}</Badge>
                                  </TableCell>
                                  <TableCell className="text-sm text-muted-foreground">
                                    {formatDateShort(absence.startDate)} - {formatDate(absence.endDate)}
                                    {absence.halfDay === "am" && <Badge variant="outline" className="ml-1 text-xs">Ochtend</Badge>}
                                    {absence.halfDay === "pm" && <Badge variant="outline" className="ml-1 text-xs">Middag</Badge>}
                                  </TableCell>
                                  <TableCell className="text-sm text-muted-foreground max-w-48 truncate">
                                    {displayReason}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={sc.variant} className={`text-xs gap-1 ${sc.className || ""}`}>
                                      <StatusIcon className="h-3 w-3" />
                                      {sc.label}
                                    </Badge>
                                  </TableCell>
                                  {isAdminOrManager && (
                                    <TableCell>
                                      {isApprovable && (
                                        <div className="flex items-center gap-2">
                                          <Checkbox
                                            checked={selectedAbsences.has(absence.id)}
                                            onCheckedChange={() => toggleOne(absence.id)}
                                            data-testid={`checkbox-absence-${absence.id}`}
                                            aria-label={`Selecteer verzoek van ${(absence as any).userName}`}
                                          />
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => updateStatusMutation.mutate({ id: absence.id, status: "approved" })}
                                            data-testid={`button-approve-absence-${absence.id}`}
                                          >
                                            <CheckCircle className="h-3 w-3 mr-1" />
                                            Goed
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => updateStatusMutation.mutate({ id: absence.id, status: "rejected" })}
                                            data-testid={`button-reject-absence-${absence.id}`}
                                          >
                                            <XCircle className="h-3 w-3 mr-1" />
                                            Afwijzen
                                          </Button>
                                        </div>
                                      )}
                                    </TableCell>
                                  )}
                                </TableRow>
                              );
                            })}
                            </>
                          ));
                        })()}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            );
          })()}
        </div>
      )}

      {activeTab === "overzicht" && isAdminOrManager && (
        <div className="space-y-3">
          {(() => {
            const processed = (absences || []).filter(a => a.status === "approved" || a.status === "rejected" || a.status === "cancelled");
            if (processed.length === 0) {
              return (
                <Card>
                  <CardContent className="flex flex-col items-center py-10">
                    <Eye className="h-10 w-10 text-muted-foreground mb-3" />
                    <p className="text-muted-foreground text-sm">Geen verwerkte meldingen</p>
                  </CardContent>
                </Card>
              );
            }
            return (
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Medewerker</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Periode</TableHead>
                          <TableHead>Reden</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(() => {
                          const sorted = [...processed].sort((a, b) => ((a as any).userName || "").localeCompare((b as any).userName || "", "nl"));
                          const depts = Array.from(new Set(sorted.map(a => (a as any).userDepartment || "Geen afdeling"))).sort((a, b) => a.localeCompare(b, "nl"));
                          return depts.map(dept => (
                            <>
                              <TableRow key={`dept-${dept}`}>
                                <TableCell colSpan={5} className="bg-muted/50 font-bold text-sm py-1.5">
                                  {dept}
                                </TableCell>
                              </TableRow>
                              {sorted.filter(a => ((a as any).userDepartment || "Geen afdeling") === dept).map((absence) => {
                                const sc = statusConfig[absence.status] || statusConfig.pending;
                                const StatusIcon = sc.icon;
                                const displayReason = absence.type === "bvvd" && absence.bvvdReason
                                  ? absence.bvvdReason + (absence.reason ? ` - ${absence.reason}` : "")
                                  : absence.reason || "-";
                                return (
                                  <TableRow key={absence.id} data-testid={`row-overzicht-${absence.id}`}>
                                    <TableCell className="font-medium text-sm pl-6">
                                      {(absence as any).userName || "Medewerker"}
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant="secondary" className="text-xs">{typeLabels[absence.type]}</Badge>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                      {formatDateShort(absence.startDate)} - {formatDate(absence.endDate)}
                                      {absence.halfDay === "am" && <Badge variant="outline" className="ml-1 text-xs">Ochtend</Badge>}
                                      {absence.halfDay === "pm" && <Badge variant="outline" className="ml-1 text-xs">Middag</Badge>}
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground max-w-48 truncate">
                                      {displayReason}
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant={sc.variant} className={`text-xs gap-1 ${sc.className || ""}`}>
                                        <StatusIcon className="h-3 w-3" />
                                        {sc.label}
                                      </Badge>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </>
                          ));
                        })()}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            );
          })()}
        </div>
      )}

      <Dialog open={snipperdagOpen} onOpenChange={setSnipperdagOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scissors className="h-5 w-5" />
              Snipperdagen Beheren
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Een snipperdag is een verplichte vrije dag voor al het personeel. Deze dag wordt automatisch afgetrokken van het vakantiesaldo van iedere medewerker.
          </p>
          <div className="flex gap-2 items-end">
            <div className="space-y-1 flex-1">
              <label className="text-xs font-medium">Naam</label>
              <Input
                value={snipperdagName}
                onChange={e => setSnipperdagName(e.target.value)}
                placeholder="bijv. Brugdag na Hemelvaart"
                data-testid="input-snipperdag-name"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Datum</label>
              <Input
                type="date"
                value={snipperdagDate}
                onChange={e => setSnipperdagDate(e.target.value)}
                data-testid="input-snipperdag-date"
              />
            </div>
            <Button
              onClick={() => createSnipperdagMutation.mutate({ name: snipperdagName, date: snipperdagDate })}
              disabled={!snipperdagName.trim() || !snipperdagDate || createSnipperdagMutation.isPending}
              data-testid="button-add-snipperdag"
            >
              <Plus className="h-4 w-4 mr-1" />
              Toevoegen
            </Button>
          </div>
          {(() => {
            const currentYear = new Date().getFullYear();
            const thisYear = (snipperdagenData || []).filter(s => s.year === currentYear);
            const otherYears = (snipperdagenData || []).filter(s => s.year !== currentYear);
            return (
              <div className="space-y-3">
                {thisYear.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-1">{currentYear} ({thisYear.length} {thisYear.length === 1 ? "dag" : "dagen"})</h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Datum</TableHead>
                          <TableHead>Naam</TableHead>
                          <TableHead className="w-12"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {thisYear.map(s => (
                          <TableRow key={s.id} data-testid={`row-snipperdag-${s.id}`}>
                            <TableCell className="text-sm">
                              {formatDate(s.date)}
                            </TableCell>
                            <TableCell className="text-sm font-medium">{s.name}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => deleteSnipperdagMutation.mutate(s.id)}
                                data-testid={`button-delete-snipperdag-${s.id}`}
                              >
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
                {otherYears.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-1 text-muted-foreground">Andere jaren</h4>
                    <Table>
                      <TableBody>
                        {otherYears.map(s => (
                          <TableRow key={s.id} data-testid={`row-snipperdag-${s.id}`}>
                            <TableCell className="text-sm text-muted-foreground">
                              {formatDate(s.date)}
                            </TableCell>
                            <TableCell className="text-sm">{s.name}</TableCell>
                            <TableCell className="w-12">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => deleteSnipperdagMutation.mutate(s.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
                {(snipperdagenData || []).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">Nog geen snipperdagen ingesteld</p>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      <AbsenceReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        absences={absences || []}
        users={allUsers || []}
      />

      {activeTab === "vakantiesaldo" && isAdminOrManager && (
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <Palmtree className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm">Vakantiesaldo Overzicht {new Date().getFullYear()}</h3>
          </CardHeader>
          <CardContent className="p-0">
            {loadingBalances ? (
              <div className="p-4"><Skeleton className="h-32" /></div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Medewerker</TableHead>
                      <TableHead className="text-right">Recht</TableHead>
                      <TableHead className="text-right">Saldo Oud</TableHead>
                      <TableHead className="text-right">Totaal</TableHead>
                      <TableHead className="text-right">Gepland</TableHead>
                      <TableHead className="text-right">Toegekend</TableHead>
                      <TableHead className="text-right">Opgenomen</TableHead>
                      <TableHead className="text-right">Ziek</TableHead>
                      <TableHead className="text-right">Snipper</TableHead>
                      <TableHead className="text-right">Cancel</TableHead>
                      <TableHead className="text-right">Saldo Nieuw</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      const sorted = [...(vacationBalances || [])].sort((a, b) => a.userName.localeCompare(b.userName, "nl"));
                      const departments = Array.from(new Set(sorted.map(b => b.department))).sort((a, b) => a.localeCompare(b, "nl"));
                      return departments.map(dept => (
                        <>
                          <TableRow key={`dept-${dept}`}>
                            <TableCell colSpan={11} className="bg-muted/50 font-bold text-sm py-1.5">
                              {dept}
                            </TableCell>
                          </TableRow>
                          {sorted.filter(b => b.department === dept).map(b => (
                            <TableRow key={b.userId} data-testid={`row-balance-${b.userId}`}>
                              <TableCell className="font-medium text-sm pl-6">{b.userName}</TableCell>
                              <TableCell className="text-right text-sm">{b.recht}</TableCell>
                              <TableCell className="text-right text-sm">
                                {b.saldoOud > 0 ? (
                                  <span>{b.saldoOud}</span>
                                ) : (
                                  <span className="text-muted-foreground">0</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right text-sm font-medium">{b.totalDays}</TableCell>
                              <TableCell className="text-right text-sm">
                                {b.geplandDays > 0 ? (
                                  <Badge variant="outline" className="text-xs">{b.geplandDays}</Badge>
                                ) : (
                                  <span className="text-muted-foreground">0</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right text-sm">{b.toegekendDays}</TableCell>
                              <TableCell className="text-right text-sm">{b.opgenomenDays}</TableCell>
                              <TableCell className="text-right text-sm">
                                {b.sickDays > 0 ? (
                                  <Badge variant="destructive" className="text-xs">{b.sickDays}</Badge>
                                ) : (
                                  <span className="text-muted-foreground">0</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right text-sm">
                                {(b.snipperdagen || 0) > 0 ? (
                                  <Badge variant="secondary" className="text-xs">{b.snipperdagen}</Badge>
                                ) : (
                                  <span className="text-muted-foreground">0</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right text-sm">
                                {(b.cancelDays || 0) > 0 ? (
                                  <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">{b.cancelDays}</Badge>
                                ) : (
                                  <span className="text-muted-foreground">0</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <Badge variant={b.remainingDays <= 3 ? "destructive" : b.remainingDays <= 10 ? "outline" : "default"} className="text-xs">
                                  {b.remainingDays}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </>
                      ));
                    })()}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "cancel-verzuim" && isAdminRole(user?.role) && (
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <XCircle className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm">Cancel Verzuim — Verlofkalender</h3>
          </CardHeader>
          <CardContent>
            <CancelVerzuimTab allUsers={allUsers || []} currentUser={user!} />
          </CardContent>
        </Card>
      )}
      </div>
    </div>
  );
}
