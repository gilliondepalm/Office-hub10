import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Plus, Clock, CheckCircle, XCircle, AlertCircle, Palmtree, CalendarDays, Pencil, ClipboardList, Eye, FileBarChart, Filter, Scissors, Trash2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import type { Absence, User, Snipperdag } from "@shared/schema";
import { isAdminRole } from "@shared/schema";
import { useAuth } from "@/lib/auth";

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
}).refine((data) => {
  if (data.type === "bvvd" && !data.bvvdReason) return false;
  return true;
}, { message: "BVVD reden is verplicht", path: ["bvvdReason"] });

type VacationBalance = {
  userId: string;
  userName: string;
  department: string;
  totalDays: number;
  geplandDays: number;
  toegekendDays: number;
  opgenomenDays: number;
  remainingDays: number;
  sickDays: number;
  snipperdagen?: number;
};

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
    personal: "Persoonlijk",
    other: "Overig",
    bvvd: "BVVD",
  };

  const statusLabels: Record<string, string> = {
    pending: "In afwachting",
    approved: "Goedgekeurd",
    rejected: "Afgewezen",
  };

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileBarChart className="h-5 w-5" />
            Afwezigheidsrapport
            {filterEmployee !== "all" && (() => {
              const emp = users.find(u => String(u.id) === filterEmployee);
              return emp ? <span className="font-normal text-muted-foreground">— {emp.fullName || emp.username}</span> : null;
            })()}
          </DialogTitle>
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
                              {format(new Date(absence.startDate + "T00:00:00"), "d MMM", { locale: nl })} - {format(new Date(absence.endDate + "T00:00:00"), "d MMM yyyy", { locale: nl })}
                              {absence.halfDay === "am" && <Badge variant="outline" className="ml-1 text-xs">Ochtend</Badge>}
                              {absence.halfDay === "pm" && <Badge variant="outline" className="ml-1 text-xs">Middag</Badge>}
                            </TableCell>
                            <TableCell className="text-right text-sm">{days}</TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-40 truncate">
                              {displayReason}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={absence.status === "approved" ? "default" : absence.status === "rejected" ? "destructive" : "outline"}
                                className="text-xs"
                              >
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

export default function VerzuimPage() {
  const [open, setOpen] = useState(false);
  const [vacDaysOpen, setVacDaysOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [snipperdagOpen, setSnipperdagOpen] = useState(false);
  const [snipperdagName, setSnipperdagName] = useState("");
  const [snipperdagDate, setSnipperdagDate] = useState("");
  const [editingUser, setEditingUser] = useState<{ id: string; name: string; days: number } | null>(null);
  const [newDays, setNewDays] = useState("");
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
    defaultValues: { type: "sick", startDate: "", endDate: "", reason: "", bvvdReason: "", halfDay: "" },
  });

  const watchType = form.watch("type");
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
      toast({ title: "Vakantiedagen bijgewerkt" });
      setEditingUser(null);
      setNewDays("");
      setVacDaysOpen(false);
    },
    onError: () => {
      toast({ title: "Fout bij bijwerken", variant: "destructive" });
    },
  });

  const typeLabels: Record<string, string> = {
    sick: "Ziekte",
    vacation: "Vakantie",
    personal: "Persoonlijk",
    other: "Overig",
    bvvd: "BVVD",
  };

  const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
    pending: { label: "In afwachting", variant: "outline", icon: AlertCircle },
    approved: { label: "Goedgekeurd", variant: "default", icon: CheckCircle },
    rejected: { label: "Afgewezen", variant: "destructive", icon: XCircle },
  };

  const isAdmin = isAdminRole(user?.role);
  const isAdminOrManager = isAdminRole(user?.role) || user?.role === "manager";

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
    <div className="p-6 space-y-4 overflow-auto h-full">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-verzuim-title">Verzuim</h1>
          <p className="text-muted-foreground text-sm">Beheer verlof- en ziekmeldingen</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {isAdminOrManager && (
            <Button variant="outline" onClick={() => setReportOpen(true)} data-testid="button-absence-report">
              <FileBarChart className="h-4 w-4 mr-2" />
              Afwezigheidsrapport
            </Button>
          )}
          {isAdmin && (
            <Button variant="outline" onClick={() => setSnipperdagOpen(true)} data-testid="button-snipperdagen">
              <Scissors className="h-4 w-4 mr-2" />
              Snipperdagen
            </Button>
          )}
          {isAdmin && (
            <Dialog open={vacDaysOpen} onOpenChange={setVacDaysOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" data-testid="button-manage-vacation-days">
                  <CalendarDays className="h-4 w-4 mr-2" />
                  Vakantiedagen Instellen
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Vakantiedagen per Medewerker</DialogTitle>
                </DialogHeader>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {loadingBalances ? (
                    <Skeleton className="h-32" />
                  ) : (
                    vacationBalances?.map((b) => (
                      <div key={b.userId} className="flex items-center justify-between gap-2 p-3 rounded-md hover-elevate" data-testid={`vacation-days-row-${b.userId}`}>
                        <span className="text-sm font-medium flex-1">{b.userName}</span>
                        {editingUser?.id === b.userId ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min="0"
                              value={newDays}
                              onChange={(e) => setNewDays(e.target.value)}
                              className="w-20"
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
                              Annuleren
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">{b.totalDays} dagen</Badge>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => { setEditingUser({ id: b.userId, name: b.userName, days: b.totalDays }); setNewDays(String(b.totalDays)); }}
                              data-testid={`button-edit-vacation-${b.userId}`}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))
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
                          <SelectItem value="personal">Persoonlijk</SelectItem>
                          <SelectItem value="bvvd">BVVD (Bijzonder Verlof)</SelectItem>
                          <SelectItem value="other">Overig</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
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
                  <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-absence">
                    {createMutation.isPending ? "Indienen..." : "Verzoek Indienen"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
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
                          {isAdminOrManager && <TableHead>Actie</TableHead>}
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
                              return (
                                <TableRow key={absence.id} data-testid={`row-absence-${absence.id}`}>
                                  <TableCell className={`font-medium text-sm ${isAdminOrManager ? "pl-6" : ""}`}>
                                    {(absence as any).userName || "Medewerker"}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="secondary" className="text-xs">{typeLabels[absence.type]}</Badge>
                                  </TableCell>
                                  <TableCell className="text-sm text-muted-foreground">
                                    {format(new Date(absence.startDate + "T00:00:00"), "d MMM", { locale: nl })} - {format(new Date(absence.endDate + "T00:00:00"), "d MMM yyyy", { locale: nl })}
                                    {absence.halfDay === "am" && <Badge variant="outline" className="ml-1 text-xs">Ochtend</Badge>}
                                    {absence.halfDay === "pm" && <Badge variant="outline" className="ml-1 text-xs">Middag</Badge>}
                                  </TableCell>
                                  <TableCell className="text-sm text-muted-foreground max-w-48 truncate">
                                    {displayReason}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={sc.variant} className="text-xs gap-1">
                                      <StatusIcon className="h-3 w-3" />
                                      {sc.label}
                                    </Badge>
                                  </TableCell>
                                  {isAdminOrManager && (
                                    <TableCell>
                                      {absence.status === "pending" && absence.userId !== user?.id && (
                                        user?.role === "directeur" ||
                                        (isAdminRole(user?.role) && !isAdminRole((absence as any).userRole) && (absence as any).userRole !== "manager") ||
                                        (user?.role === "manager" && (absence as any).userRole === "employee")
                                      ) && (
                                        <div className="flex gap-1">
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
            const processed = (absences || []).filter(a => a.status === "approved" || a.status === "rejected");
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
                                      {format(new Date(absence.startDate + "T00:00:00"), "d MMM", { locale: nl })} - {format(new Date(absence.endDate + "T00:00:00"), "d MMM yyyy", { locale: nl })}
                                      {absence.halfDay === "am" && <Badge variant="outline" className="ml-1 text-xs">Ochtend</Badge>}
                                      {absence.halfDay === "pm" && <Badge variant="outline" className="ml-1 text-xs">Middag</Badge>}
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground max-w-48 truncate">
                                      {displayReason}
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant={sc.variant} className="text-xs gap-1">
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
                              {format(new Date(s.date + "T00:00:00"), "d MMMM yyyy", { locale: nl })}
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
                              {format(new Date(s.date + "T00:00:00"), "d MMMM yyyy", { locale: nl })}
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
                      <TableHead className="text-right">Totaal</TableHead>
                      <TableHead className="text-right">Gepland</TableHead>
                      <TableHead className="text-right">Toegekend</TableHead>
                      <TableHead className="text-right">Opgenomen</TableHead>
                      <TableHead className="text-right">Ziek</TableHead>
                      <TableHead className="text-right">Snipper</TableHead>
                      <TableHead className="text-right">Resterend</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(() => {
                      const sorted = [...(vacationBalances || [])].sort((a, b) => a.userName.localeCompare(b.userName, "nl"));
                      const departments = Array.from(new Set(sorted.map(b => b.department))).sort((a, b) => a.localeCompare(b, "nl"));
                      return departments.map(dept => (
                        <>
                          <TableRow key={`dept-${dept}`}>
                            <TableCell colSpan={8} className="bg-muted/50 font-bold text-sm py-1.5">
                              {dept}
                            </TableCell>
                          </TableRow>
                          {sorted.filter(b => b.department === dept).map(b => (
                            <TableRow key={b.userId} data-testid={`row-balance-${b.userId}`}>
                              <TableCell className="font-medium text-sm pl-6">{b.userName}</TableCell>
                              <TableCell className="text-right text-sm">{b.totalDays}</TableCell>
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
    </div>
  );
}
