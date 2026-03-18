import { useState, useMemo, useEffect, Fragment } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { PageHero } from "@/components/page-hero";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

function findDuplicateAbsenceIds(
  absences: Array<{ id: string; userId: string; startDate: string; endDate: string; halfDay?: string | null; status: string }>
): Set<string> {
  const active = absences.filter(a => a.status === "pending" || a.status === "approved");
  const byUser = new Map<string, typeof active>();
  for (const a of active) {
    if (!byUser.has(a.userId)) byUser.set(a.userId, []);
    byUser.get(a.userId)!.push(a);
  }
  const duplicateIds = new Set<string>();
  for (const [, userAbsences] of byUser) {
    for (let i = 0; i < userAbsences.length; i++) {
      for (let j = i + 1; j < userAbsences.length; j++) {
        const a = userAbsences[i];
        const b = userAbsences[j];
        if (a.endDate < b.startDate || b.endDate < a.startDate) continue;
        const aHalf = a.halfDay || "full";
        const bHalf = b.halfDay || "full";
        const conflicts = aHalf === "full" || bHalf === "full" || aHalf === bHalf;
        if (conflicts) {
          duplicateIds.add(a.id);
          duplicateIds.add(b.id);
        }
      }
    }
  }
  return duplicateIds;
}

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
          const baseReason = a.type === "bvvd" && a.bvvdReason
            ? a.bvvdReason + (a.reason ? ` - ${a.reason}` : "")
            : a.reason || "-";
          const reason = a.status === "cancelled" && (a as any).cancelReason
            ? `${baseReason !== "-" ? baseReason + " · " : ""}Annulering: ${(a as any).cancelReason}`
            : baseReason;
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
                        const baseReason = absence.type === "bvvd" && absence.bvvdReason
                          ? absence.bvvdReason + (absence.reason ? ` - ${absence.reason}` : "")
                          : absence.reason || "-";
                        const displayReason = absence.status === "cancelled" && (absence as any).cancelReason
                          ? `${baseReason !== "-" ? baseReason + " · " : ""}Annulering: ${(absence as any).cancelReason}`
                          : baseReason;
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
  const [confirmDay, setConfirmDay] = useState<{ dateStr: string; absence: Absence } | null>(null);
  const [cancelReason, setCancelReason] = useState<string>("");
  const { toast } = useToast();

  const year = new Date().getFullYear();
  const today = new Date().toISOString().split("T")[0];

  const typeLabelsCancel: Record<string, string> = {
    vacation: "Vakantie", sick: "Ziekte", personal: "Geoorloofd", other: "Ongeoorloofd", bvvd: "BVVD",
  };

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

  const { data: dayCancellations, isLoading: loadingCancellations } = useQuery<any[]>({
    queryKey: ["/api/absence-cancellations/user", selectedUserId],
    enabled: !!selectedUserId,
  });

  const cancelledDates = useMemo(() => {
    const set = new Set<string>();
    for (const c of dayCancellations || []) set.add(c.cancelledDate);
    return set;
  }, [dayCancellations]);

  const dateToAbsence = useMemo(() => {
    const map: Record<string, Absence> = {};
    for (const abs of userAbsences || []) {
      if (abs.status === "cancelled") continue;
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
    mutationFn: async ({ absenceId, cancelledDate, reason }: { absenceId: string; cancelledDate: string; reason: string }) => {
      const res = await apiRequest("POST", `/api/absence-cancellations`, { absenceId, cancelledDate, cancelReason: reason });
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/absence-cancellations/user", selectedUserId] });
      queryClient.invalidateQueries({ queryKey: ["/api/absence-cancellations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/absences"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vacation-balance"] });
      const dateLabel = confirmDay?.dateStr ? formatDate(confirmDay.dateStr) : "datum";
      if (data.affectsBalance) {
        toast({ title: `${dateLabel} gecanceld — ${data.daysBooked} dag(en) teruggeboekt op vakantiesaldo` });
      } else {
        toast({ title: `${dateLabel} gecanceld` });
      }
      setConfirmDay(null);
      setCancelReason("");
    },
    onError: (err: any) => {
      toast({ title: err.message || "Annuleren mislukt", variant: "destructive" });
    },
  });

  const getTypeCellColor = (abs: Absence, isCancelledDay: boolean) => {
    if (isCancelledDay) return "bg-slate-300 text-slate-500 dark:bg-slate-700 dark:text-slate-400 line-through cursor-default opacity-60";
    const status = abs.status;
    const type = abs.type;
    if (type === "sick") {
      return status === "pending"
        ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200 cursor-pointer hover:bg-red-200 font-semibold"
        : "bg-red-200 text-red-900 dark:bg-red-800/50 dark:text-red-200 cursor-pointer hover:bg-red-300 font-semibold";
    }
    if (type === "bvvd") {
      return status === "pending"
        ? "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200 cursor-pointer hover:bg-purple-200 font-semibold"
        : "bg-purple-200 text-purple-900 dark:bg-purple-800/50 dark:text-purple-200 cursor-pointer hover:bg-purple-300 font-semibold";
    }
    if (type === "vacation" || type === "personal" || type === "other") {
      if (status === "pending") return "bg-yellow-200 text-yellow-900 dark:bg-yellow-800/50 dark:text-yellow-200 cursor-pointer hover:bg-yellow-300 font-semibold";
      return "bg-green-200 text-green-900 dark:bg-green-800/50 dark:text-green-200 cursor-pointer hover:bg-green-300 font-semibold";
    }
    return "cursor-pointer hover:bg-muted font-semibold";
  };

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

    const hasAbsence = days.some(d => d && dateToAbsence[d.toISOString().split("T")[0]]);

    return (
      <div key={monthIndex} className={`border rounded-lg p-3 space-y-2 ${hasAbsence ? "border-primary/30 bg-primary/5" : ""}`}>
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
            const isCancelledDay = cancelledDates.has(dateStr);
            const isHalfDay = absence && (absence.halfDay === "am" || absence.halfDay === "pm");

            let cellClass = "h-6 w-6 mx-auto flex items-center justify-center rounded text-[11px] select-none relative";

            if (isCancelledDay && absence) {
              cellClass += " " + getTypeCellColor(absence, true);
            } else if (absence) {
              cellClass += " " + getTypeCellColor(absence, false);
            } else if (isWeekend) {
              cellClass += " text-muted-foreground/40";
            } else {
              cellClass += " text-foreground/70";
            }

            const typeLabel = absence ? (typeLabelsCancel[absence.type] || absence.type) : "";
            const titleText = absence && !isCancelledDay
              ? `${typeLabel} — klik om deze dag te cancelen`
              : isCancelledDay ? `${typeLabel} — al gecanceld` : undefined;

            return (
              <div
                key={dateStr}
                className={cellClass}
                title={titleText}
                onClick={absence && !isCancelledDay ? () => setConfirmDay({ dateStr, absence }) : undefined}
                data-testid={absence ? `day-cancel-${dateStr}` : undefined}
              >
                {date.getDate()}
                {isHalfDay && !isCancelledDay && (
                  <span className="absolute -top-0.5 -right-0.5 text-[7px] leading-none font-bold">½</span>
                )}
                {isCancelledDay && (
                  <span className="absolute -top-0.5 -right-0.5 text-[7px] leading-none font-bold text-slate-500">✕</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const selectedUser = allUsers.find(u => u.id === selectedUserId);

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
        <div className="flex gap-3 text-xs text-muted-foreground flex-wrap items-center">
          <span className="font-medium">Legenda:</span>
          <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded bg-green-200 border border-green-400" />Vakantie</div>
          <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded bg-red-200 border border-red-400" />Ziekte</div>
          <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded bg-purple-200 border border-purple-400" />BVVD</div>
          <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded bg-yellow-200 border border-yellow-400" />Gepland/pending</div>
          <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded bg-slate-300 border border-slate-400 opacity-60" />Gecanceld</div>
          <span className="text-muted-foreground/60">— klik op een dag om die specifieke dag te cancelen</span>
        </div>
      )}

      {selectedUserId && (
        loadingAbsences || loadingCancellations ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 12 }, (_, i) => renderMonth(i))}
          </div>
        )
      )}

      {selectedUserId && dayCancellations && dayCancellations.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Gecancelde dagen — {selectedUser?.fullName}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6 text-xs">Datum</TableHead>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs">Effect saldo</TableHead>
                    <TableHead className="text-xs">Reden</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dayCancellations.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="pl-6 text-sm font-medium">{formatDate(c.cancelledDate)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">{typeLabelsCancel[c.absenceType] || c.absenceType}</Badge>
                      </TableCell>
                      <TableCell>
                        {c.affectsBalance
                          ? <Badge className="text-xs bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-200">+1 dag teruggestort</Badge>
                          : <Badge variant="outline" className="text-xs text-muted-foreground">Geen effect</Badge>
                        }
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        <span className="whitespace-pre-wrap break-words">{c.cancelReason || <span className="italic opacity-60">–</span>}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {!selectedUserId && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <CalendarDays className="h-12 w-12 mb-3 opacity-25" />
          <p className="text-sm">Selecteer een afdeling en medewerker om de kalender te tonen</p>
        </div>
      )}

      {confirmDay && (
        <Dialog open={!!confirmDay} onOpenChange={(open) => { if (!open) { setConfirmDay(null); setCancelReason(""); } }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Dag cancelen</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground text-xs">Te cancelen datum</span>
                <span className="text-base font-semibold">{formatDate(confirmDay.dateStr)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground text-xs">Type:</span>
                <Badge variant="secondary" className="text-xs">{typeLabelsCancel[confirmDay.absence.type] || confirmDay.absence.type}</Badge>
                {(confirmDay.absence.halfDay === "am" || confirmDay.absence.halfDay === "pm") && (
                  <Badge variant="outline" className="text-xs">Halve dag ({confirmDay.absence.halfDay === "am" ? "ochtend" : "middag"})</Badge>
                )}
              </div>
              <div className="flex gap-1 text-xs text-muted-foreground">
                <span>Originele periode:</span>
                <span className="font-medium">{formatDate(confirmDay.absence.startDate)}{confirmDay.absence.startDate !== confirmDay.absence.endDate ? ` t/m ${formatDate(confirmDay.absence.endDate)}` : ""}</span>
                <span className="italic">(ongewijzigd)</span>
              </div>
              {confirmDay.absence.type === "vacation" ? (
                <p className="text-amber-600 dark:text-amber-400 text-xs bg-amber-50 dark:bg-amber-950/20 rounded px-2 py-1.5 border border-amber-200 dark:border-amber-800">
                  Dit is een vakantiedag — annulering boekt 1 dag terug op het vakantiesaldo.
                </p>
              ) : (
                <p className="text-muted-foreground text-xs bg-muted/50 rounded px-2 py-1.5 border">
                  Ziekte/BVVD — annulering wordt geregistreerd maar heeft geen effect op het vakantiesaldo.
                </p>
              )}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Reden voor annulering</label>
                <textarea
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                  rows={3}
                  placeholder="Geef een reden op (optioneel)…"
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  data-testid="textarea-cancel-reason"
                />
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-2">
              <Button variant="outline" onClick={() => { setConfirmDay(null); setCancelReason(""); }}>Sluiten</Button>
              <Button
                variant="destructive"
                disabled={cancelMutation.isPending}
                onClick={() => cancelMutation.mutate({ absenceId: confirmDay.absence.id, cancelledDate: confirmDay.dateStr, reason: cancelReason })}
                data-testid="button-confirm-cancel"
              >
                <XCircle className="h-4 w-4 mr-1.5" />
                {cancelMutation.isPending ? "Bezig…" : "Dag cancelen"}
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
  const [cancelDetailAbsence, setCancelDetailAbsence] = useState<any | null>(null);
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

  const { data: allDayCancellations } = useQuery<any[]>({
    queryKey: ["/api/absence-cancellations"],
    enabled: isAdminRole(user?.role) || user?.role === "manager" || user?.role === "manager_az",
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

  const deleteAbsenceMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/absences/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/absences"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vacation-balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/absence-cancellations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Melding verwijderd" });
    },
    onError: () => {
      toast({ title: "Verwijderen mislukt", variant: "destructive" });
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

  const isPureManager = user?.role === "manager";
  const myDept = user?.department || "";

  const deptFilteredAbsences = isPureManager && myDept
    ? (absences || []).filter(a => (a as any).userDepartment === myDept)
    : (absences || []);

  const deptFilteredUsers = isPureManager && myDept
    ? (allUsers || []).filter(u => u.department === myDept)
    : (allUsers || []);

  const duplicateAbsenceIds = useMemo(
    () => findDuplicateAbsenceIds(deptFilteredAbsences),
    [deptFilteredAbsences]
  );

  const canApprove = (absence: any) => {
    if (absence.status !== "pending" || absence.userId === user?.id) return false;
    if (user?.role === "directeur") return true;
    if (isAdminRole(user?.role) && !isAdminRole(absence.userRole) && absence.userRole !== "manager" && absence.userRole !== "manager_az") return true;
    if ((user?.role === "manager" || user?.role === "manager_az") && absence.userRole === "employee") {
      if (isPureManager && myDept && (absence as any).userDepartment !== myDept) return false;
      return true;
    }
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
              ? deptFilteredAbsences.filter(a => a.status === "pending")
              : deptFilteredAbsences;
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
                              const baseReason = absence.type === "bvvd" && absence.bvvdReason
                                ? absence.bvvdReason + (absence.reason ? ` - ${absence.reason}` : "")
                                : absence.reason || "-";
                              const displayReason = absence.status === "cancelled" && (absence as any).cancelReason
                                ? `${baseReason !== "-" ? baseReason + " · " : ""}Annulering: ${(absence as any).cancelReason}`
                                : baseReason;
                              const isApprovable = canApprove(absence);
                              const isDuplicate = duplicateAbsenceIds.has(absence.id);
                              const canDeleteThis = isAdminOrManager || absence.userId === user?.id;
                              return (
                                <TableRow key={absence.id} data-testid={`row-absence-${absence.id}`} className={isDuplicate ? "bg-red-50/40 dark:bg-red-950/20" : ""}>
                                  <TableCell className={`font-medium text-sm ${isAdminOrManager ? "pl-6" : ""}`}>
                                    {(absence as any).userName || "Medewerker"}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex flex-col gap-0.5">
                                      <div className="flex items-center gap-1">
                                        <Badge variant="secondary" className="text-xs">{typeLabels[absence.type]}</Badge>
                                        {isDuplicate && <span className="text-destructive font-bold text-sm leading-none">*</span>}
                                      </div>
                                      {isDuplicate && (
                                        <div className="flex items-center gap-1">
                                          <span className="text-xs text-destructive font-medium">Invoer dubbelvoudig, kan niet</span>
                                          {canDeleteThis && (
                                            <Button
                                              size="icon"
                                              variant="ghost"
                                              className="h-5 w-5 text-destructive hover:text-destructive hover:bg-destructive/10"
                                              onClick={() => deleteAbsenceMutation.mutate(absence.id)}
                                              disabled={deleteAbsenceMutation.isPending}
                                              data-testid={`button-delete-duplicate-${absence.id}`}
                                              title="Verwijder dubbele invoer"
                                            >
                                              <Trash2 className="h-3 w-3" />
                                            </Button>
                                          )}
                                        </div>
                                      )}
                                    </div>
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
            const processedAbsences = deptFilteredAbsences.filter(a => a.status === "approved" || a.status === "rejected" || a.status === "cancelled");
            const filteredDayCancels = (allDayCancellations || []).filter(c => {
              if (isPureManager && myDept) return c.userDepartment === myDept;
              return true;
            });

            const allRows = [
              ...processedAbsences.map(a => ({ _kind: "absence" as const, dept: (a as any).userDepartment || "Geen afdeling", row: a })),
              ...filteredDayCancels.map(c => ({ _kind: "dayCancel" as const, dept: c.userDepartment || "Geen afdeling", row: c })),
            ];

            if (allRows.length === 0) {
              return (
                <Card>
                  <CardContent className="flex flex-col items-center py-10">
                    <Eye className="h-10 w-10 text-muted-foreground mb-3" />
                    <p className="text-muted-foreground text-sm">Geen verwerkte meldingen</p>
                  </CardContent>
                </Card>
              );
            }

            const depts = Array.from(new Set(allRows.map(r => r.dept))).sort((a, b) => a.localeCompare(b, "nl"));

            return (
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Medewerker</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Periode / Datum</TableHead>
                          <TableHead>Reden</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {depts.map(dept => {
                          const deptRows = allRows
                            .filter(r => r.dept === dept)
                            .sort((a, b) => {
                              const nameA = a.row.userName || "";
                              const nameB = b.row.userName || "";
                              return nameA.localeCompare(nameB, "nl");
                            });
                          return (
                            <Fragment key={dept}>
                              <TableRow>
                                <TableCell colSpan={5} className="bg-muted/50 font-bold text-sm py-1.5">
                                  {dept}
                                </TableCell>
                              </TableRow>
                              {deptRows.map((item) => {
                                if (item._kind === "absence") {
                                  const absence = item.row;
                                  const sc = statusConfig[absence.status] || statusConfig.pending;
                                  const StatusIcon = sc.icon;
                                  const baseReason = absence.type === "bvvd" && absence.bvvdReason
                                    ? absence.bvvdReason + (absence.reason ? ` - ${absence.reason}` : "")
                                    : absence.reason || "-";
                                  const displayReason = absence.status === "cancelled" && absence.cancelReason
                                    ? `${baseReason !== "-" ? baseReason + " · " : ""}Annulering: ${absence.cancelReason}`
                                    : baseReason;
                                  const isCancelled = absence.status === "cancelled";
                                  const isDupOvz = duplicateAbsenceIds.has(absence.id);
                                  return (
                                    <TableRow
                                      key={`abs-${absence.id}`}
                                      data-testid={`row-overzicht-${absence.id}`}
                                      className={isDupOvz ? "bg-red-50/40 dark:bg-red-950/20" : isCancelled ? "cursor-pointer hover:bg-orange-50/60 dark:hover:bg-orange-950/20" : ""}
                                      onClick={isCancelled ? () => setCancelDetailAbsence(absence) : undefined}
                                      title={isCancelled ? "Klik om annuleringsdetails te bekijken" : undefined}
                                    >
                                      <TableCell className="font-medium text-sm pl-6">{absence.userName || "Medewerker"}</TableCell>
                                      <TableCell>
                                        <div className="flex flex-col gap-0.5">
                                          <div className="flex items-center gap-1">
                                            <Badge variant="secondary" className="text-xs">{typeLabels[absence.type]}</Badge>
                                            {isDupOvz && <span className="text-destructive font-bold text-sm leading-none">*</span>}
                                          </div>
                                          {isDupOvz && (
                                            <div className="flex items-center gap-1">
                                              <span className="text-xs text-destructive font-medium">Invoer dubbelvoudig, kan niet</span>
                                              <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-5 w-5 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                onClick={(e) => { e.stopPropagation(); deleteAbsenceMutation.mutate(absence.id); }}
                                                disabled={deleteAbsenceMutation.isPending}
                                                data-testid={`button-delete-duplicate-ovz-${absence.id}`}
                                                title="Verwijder dubbele invoer"
                                              >
                                                <Trash2 className="h-3 w-3" />
                                              </Button>
                                            </div>
                                          )}
                                        </div>
                                      </TableCell>
                                      <TableCell className="text-sm text-muted-foreground">
                                        {formatDateShort(absence.startDate)} - {formatDate(absence.endDate)}
                                        {absence.halfDay === "am" && <Badge variant="outline" className="ml-1 text-xs">Ochtend</Badge>}
                                        {absence.halfDay === "pm" && <Badge variant="outline" className="ml-1 text-xs">Middag</Badge>}
                                      </TableCell>
                                      <TableCell className="text-sm text-muted-foreground max-w-48 truncate">{displayReason}</TableCell>
                                      <TableCell>
                                        <div className="flex items-center gap-1.5">
                                          <Badge variant={sc.variant} className={`text-xs gap-1 ${sc.className || ""}`}>
                                            <StatusIcon className="h-3 w-3" />{sc.label}
                                          </Badge>
                                          {isCancelled && <span className="text-xs text-orange-500 underline underline-offset-2">details</span>}
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  );
                                } else {
                                  const c = item.row;
                                  return (
                                    <TableRow
                                      key={`dc-${c.id}`}
                                      data-testid={`row-daycancel-${c.id}`}
                                      className="cursor-pointer hover:bg-orange-50/60 dark:hover:bg-orange-950/20"
                                      onClick={() => setCancelDetailAbsence({ _isDayCancel: true, ...c })}
                                      title="Klik om details te bekijken"
                                    >
                                      <TableCell className="font-medium text-sm pl-6">{c.userName || "Medewerker"}</TableCell>
                                      <TableCell>
                                        <div className="flex items-center gap-1.5">
                                          <Badge variant="secondary" className="text-xs">{typeLabels[c.absenceType] || c.absenceType}</Badge>
                                          <Badge variant="outline" className="text-[10px] px-1 py-0 border-orange-300 text-orange-600">dag</Badge>
                                        </div>
                                      </TableCell>
                                      <TableCell className="text-sm text-muted-foreground">{formatDate(c.cancelledDate)}</TableCell>
                                      <TableCell className="text-sm text-muted-foreground max-w-48 truncate">
                                        {c.cancelReason || <span className="italic opacity-60">–</span>}
                                      </TableCell>
                                      <TableCell>
                                        <div className="flex items-center gap-1.5">
                                          <Badge variant="secondary" className="text-xs gap-1 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
                                            <Ban className="h-3 w-3" />Gecanceld
                                          </Badge>
                                          <span className="text-xs text-orange-500 underline underline-offset-2">details</span>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  );
                                }
                              })}
                            </Fragment>
                          );
                        })}
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
        absences={deptFilteredAbsences}
        users={deptFilteredUsers}
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
                      const allBalances = isPureManager && myDept
                        ? (vacationBalances || []).filter(b => b.department === myDept)
                        : (vacationBalances || []);
                      const sorted = [...allBalances].sort((a, b) => a.userName.localeCompare(b.userName, "nl"));
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

      {cancelDetailAbsence && (
        <Dialog open={!!cancelDetailAbsence} onOpenChange={(v) => { if (!v) setCancelDetailAbsence(null); }}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Ban className="h-4 w-4 text-orange-500" />
                {cancelDetailAbsence._isDayCancel ? "Dag-annulering details" : "Reden voor annulering"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Medewerker</span>
                <span className="font-medium">{cancelDetailAbsence.userName || "Medewerker"}</span>
              </div>
              {cancelDetailAbsence._isDayCancel ? (
                <>
                  <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Gecancelde datum</span>
                    <span className="font-semibold">{formatDate(cancelDetailAbsence.cancelledDate)}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Type</span>
                    <span>{({ sick: "Ziekte", vacation: "Vakantie", personal: "Geoorloofd", other: "Ongeoorloofd", bvvd: "BVVD" } as any)[cancelDetailAbsence.absenceType] || cancelDetailAbsence.absenceType}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Effect op saldo</span>
                    {(cancelDetailAbsence.affectsBalance || cancelDetailAbsence.absenceType === "vacation")
                      ? <Badge className="w-fit text-xs bg-amber-100 text-amber-800 border-amber-300">+1 dag teruggestort op vakantiesaldo</Badge>
                      : <span className="text-muted-foreground italic">Geen effect op vakantiesaldo</span>
                    }
                  </div>
                </>
              ) : (
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Periode</span>
                  <span>{formatDate(cancelDetailAbsence.startDate)}{cancelDetailAbsence.startDate !== cancelDetailAbsence.endDate ? ` t/m ${formatDate(cancelDetailAbsence.endDate)}` : ""}</span>
                </div>
              )}
              {!cancelDetailAbsence._isDayCancel && (
                <div className="flex flex-col gap-1">
                  <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Type</span>
                  <span>{({ sick: "Ziekte", vacation: "Vakantie", personal: "Geoorloofd", other: "Ongeoorloofd", bvvd: "BVVD" } as any)[cancelDetailAbsence.type] || cancelDetailAbsence.type}</span>
                </div>
              )}
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Reden voor annulering</span>
                {cancelDetailAbsence.cancelReason ? (
                  <p className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-md px-3 py-2 text-orange-900 dark:text-orange-200 leading-relaxed">
                    {cancelDetailAbsence.cancelReason}
                  </p>
                ) : (
                  <p className="text-muted-foreground italic text-sm">Geen reden opgegeven</p>
                )}
              </div>
            </div>
            <div className="flex justify-end mt-1">
              <Button variant="outline" size="sm" onClick={() => setCancelDetailAbsence(null)}>Sluiten</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
