import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { isAdminRole } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { format, isValid } from "date-fns";
import { nl } from "date-fns/locale";
import { PageHero } from "@/components/page-hero";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LogIn, LogOut, Clock, Users, AlertCircle, CheckCircle, XCircle, Loader2, Trash2, Plus, CalendarDays } from "lucide-react";
import type { User } from "@shared/schema";

type Werktijd = {
  logid: number;
  userid: string;
  checktime: string;
  checktype: string;
};

type OveruurAanvraag = {
  id: string;
  userid: string;
  datum: string;
  reden: string | null;
  aangevraagdDoor: string | null;
  goedgekeurdDoor: string | null;
  status: string;
  createdAt: string;
};

// ── Werktijdregels ───────────────────────────────────────────────────────────
// Officieel: Ma-Do 7:30-12:00 en 13:30-17:00 | Vr 7:30-12:00 en 13:30-16:30
// Variabel inklokken: tot 8:00 | Variabel uitklokken: vanaf 11:45 (Vr: 16:15)
// Inhaal: inklokken vanaf 7:00 (eerder = 7:00), uitklokken tot 18:00 (later = 17:00)
// Pauze 12:00-13:30 verplicht, telt niet als werktijd
// Overuren: na goedkeuring directie, uitklok na 18:00 toegestaan

const MIN_IN_HOUR = 7;
const MIN_IN_MIN = 0;
const MAX_OUT_HOUR = 17;
const BREAK_START_HOUR = 12;
const BREAK_END_HOUR = 13;
const BREAK_END_MIN = 30;

function toMinutes(h: number, m: number) { return h * 60 + m; }

function calcWerkminuten(inTime: Date, outTime: Date, isFriday: boolean, hasOveruur: boolean): number {
  const effectiveInMin = Math.max(toMinutes(inTime.getHours(), inTime.getMinutes()), toMinutes(MIN_IN_HOUR, MIN_IN_MIN));
  const maxOutMin = hasOveruur ? toMinutes(outTime.getHours(), outTime.getMinutes()) : toMinutes(isFriday ? 16 : MAX_OUT_HOUR, isFriday ? 30 : 0);
  const effectiveOutMin = Math.min(toMinutes(outTime.getHours(), outTime.getMinutes()), maxOutMin);
  if (effectiveOutMin <= effectiveInMin) return 0;
  const breakStart = toMinutes(BREAK_START_HOUR, 0);
  const breakEnd = toMinutes(BREAK_END_HOUR, BREAK_END_MIN);
  let worked = effectiveOutMin - effectiveInMin;
  const overlapStart = Math.max(effectiveInMin, breakStart);
  const overlapEnd = Math.min(effectiveOutMin, breakEnd);
  if (overlapEnd > overlapStart) worked -= (overlapEnd - overlapStart);
  return Math.max(0, worked);
}

function formatMinuten(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}u ${m.toString().padStart(2, "0")}m`;
}

function parseChecktime(ct: string): Date {
  if (ct.includes("T")) return new Date(ct);
  return new Date(ct.replace(" ", "T"));
}

function formatChecktime(ct: string): string {
  try {
    const d = parseChecktime(ct);
    if (!isValid(d)) return ct;
    return format(d, "dd-MM-yyyy HH:mm:ss", { locale: nl });
  } catch { return ct; }
}

function dateKey(ct: string): string {
  try {
    const d = parseChecktime(ct);
    return format(d, "yyyy-MM-dd");
  } catch { return ct.slice(0, 10); }
}

// ── Dag-samenvattingen ───────────────────────────────────────────────────────
type DagSamenvatting = {
  datum: string;
  weekdag: string;
  eersteIn: Date | null;
  lastUit: Date | null;
  records: Werktijd[];
  werkminuten: number;
  status: "volledig" | "te_laat" | "te_vroeg_uit" | "onvolledig" | "overuur";
  hasOveruur: boolean;
};

function buildDagSamenvattingen(records: Werktijd[], overuurDagen: Set<string>): DagSamenvatting[] {
  const byDay: Record<string, Werktijd[]> = {};
  for (const r of records) {
    const k = dateKey(r.checktime);
    if (!byDay[k]) byDay[k] = [];
    byDay[k].push(r);
  }
  return Object.entries(byDay)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([datum, recs]) => {
      const sorted = [...recs].sort((a, b) =>
        parseChecktime(a.checktime).getTime() - parseChecktime(b.checktime).getTime()
      );
      const ins = sorted.filter(r => r.checktype === "in").map(r => parseChecktime(r.checktime));
      const outs = sorted.filter(r => r.checktype === "out").map(r => parseChecktime(r.checktime));
      const eersteIn = ins.length > 0 ? ins[0] : null;
      const lastUit = outs.length > 0 ? outs[outs.length - 1] : null;
      const d = new Date(datum + "T00:00:00");
      const isFriday = d.getDay() === 5;
      const hasOveruur = overuurDagen.has(datum);
      let werkminuten = 0;
      if (eersteIn && lastUit) {
        werkminuten = calcWerkminuten(eersteIn, lastUit, isFriday, hasOveruur);
      }
      const inH = eersteIn ? eersteIn.getHours() * 60 + eersteIn.getMinutes() : 0;
      const outH = lastUit ? lastUit.getHours() * 60 + lastUit.getMinutes() : 0;
      let status: DagSamenvatting["status"] = "onvolledig";
      if (eersteIn && lastUit) {
        if (hasOveruur && outH > toMinutes(18, 0)) status = "overuur";
        else if (inH > toMinutes(8, 0)) status = "te_laat";
        else if (outH < toMinutes(isFriday ? 16 : 17, isFriday ? 15 : 0)) status = "te_vroeg_uit";
        else status = "volledig";
      }
      const weekdag = format(new Date(datum + "T00:00:00"), "EEEE", { locale: nl });
      return { datum, weekdag, eersteIn, lastUit, records: sorted, werkminuten, status, hasOveruur };
    });
}

function StatusBadge({ status }: { status: string }) {
  if (status === "volledig") return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">Volledig</Badge>;
  if (status === "te_laat") return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100">Te laat ingeklokt</Badge>;
  if (status === "te_vroeg_uit") return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100">Vroeg uitgeklokt</Badge>;
  if (status === "overuur") return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">Overuren</Badge>;
  return <Badge variant="outline">Onvolledig</Badge>;
}

// ── Hoofd component ──────────────────────────────────────────────────────────
export default function WerktijdenPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isManager = isAdminRole(user?.role) || user?.role === "manager" || user?.role === "manager_az";
  const isDirecteur = user?.role === "directeur" || isAdminRole(user?.role);

  const [filterUserid, setFilterUserid] = useState<string>("all");
  const [overuurOpen, setOveruurOpen] = useState(false);
  const [overuurForm, setOveruurForm] = useState({ userid: "", datum: "", reden: "" });

  const { data: records = [], isLoading } = useQuery<Werktijd[]>({
    queryKey: ["/api/werktijden"],
  });

  const { data: overuurAanvragen = [] } = useQuery<OveruurAanvraag[]>({
    queryKey: ["/api/overuur-aanvragen"],
  });

  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: isManager,
  });

  const activeUsers = (allUsers as any[]).filter((u: any) => u.active && u.kadasterId);

  const overuurDagen = useMemo(() => {
    const s = new Set<string>();
    overuurAanvragen.filter(a => a.status === "goedgekeurd").forEach(a => {
      if (a.userid && a.datum) s.add(`${a.userid}::${a.datum}`);
    });
    return s;
  }, [overuurAanvragen]);

  const myRecords = records.filter(r => r.userid === (user as any)?.kadasterId);
  const myOveruurDagen = useMemo(() => {
    const s = new Set<string>();
    overuurAanvragen.filter(a => a.status === "goedgekeurd" && a.userid === (user as any)?.kadasterId)
      .forEach(a => s.add(a.datum));
    return s;
  }, [overuurAanvragen, user]);

  const today = format(new Date(), "yyyy-MM-dd");
  const todayMyRecords = myRecords.filter(r => dateKey(r.checktime) === today);
  const lastTodayRecord = todayMyRecords.length > 0
    ? todayMyRecords.sort((a, b) => parseChecktime(b.checktime).getTime() - parseChecktime(a.checktime).getTime())[0]
    : null;
  const isClockedIn = lastTodayRecord?.checktype === "in";

  const clockMutation = useMutation({
    mutationFn: async (checktype: "in" | "out") => {
      const res = await apiRequest("POST", "/api/werktijden", { checktype });
      return res.json();
    },
    onSuccess: (_, checktype) => {
      queryClient.invalidateQueries({ queryKey: ["/api/werktijden"] });
      toast({
        title: checktype === "in" ? "Ingeklokt" : "Uitgeklokt",
        description: `${format(new Date(), "HH:mm:ss")} — ${format(new Date(), "dd-MM-yyyy")}`,
      });
    },
    onError: (err: any) => {
      toast({ title: "Fout", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (logid: number) => {
      await apiRequest("DELETE", `/api/werktijden/${logid}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/werktijden"] });
      toast({ title: "Record verwijderd" });
    },
    onError: (err: any) => {
      toast({ title: "Fout bij verwijderen", description: err.message, variant: "destructive" });
    },
  });

  const overuurMutation = useMutation({
    mutationFn: async (data: { userid: string; datum: string; reden: string }) => {
      const res = await apiRequest("POST", "/api/overuur-aanvragen", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/overuur-aanvragen"] });
      toast({ title: "Overuur aanvraag ingediend" });
      setOveruurOpen(false);
      setOveruurForm({ userid: "", datum: "", reden: "" });
    },
    onError: (err: any) => {
      toast({ title: "Fout", description: err.message, variant: "destructive" });
    },
  });

  const overuurBeoordeelMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/overuur-aanvragen/${id}`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/overuur-aanvragen"] });
      toast({ title: "Overuur aanvraag bijgewerkt" });
    },
    onError: (err: any) => {
      toast({ title: "Fout", description: err.message, variant: "destructive" });
    },
  });

  const getUserName = (kadasterId: string) => {
    const u = activeUsers.find((u: any) => u.kadasterId === kadasterId);
    return u ? (u as any).fullName || u.username : kadasterId;
  };

  const filteredRecords = isManager && filterUserid !== "all"
    ? records.filter(r => r.userid === filterUserid)
    : records;

  const myDagSamenvattingen = buildDagSamenvattingen(myRecords, myOveruurDagen);

  const overviewByUser = useMemo(() => {
    if (!isManager) return {};
    const grouped: Record<string, Werktijd[]> = {};
    const toShow = filterUserid !== "all" ? filteredRecords : records;
    for (const r of toShow) {
      if (!grouped[r.userid]) grouped[r.userid] = [];
      grouped[r.userid].push(r);
    }
    return grouped;
  }, [records, filteredRecords, isManager, filterUserid]);

  const now = new Date();
  const currentHourMin = now.getHours() * 60 + now.getMinutes();
  const isBreakTime = currentHourMin >= toMinutes(12, 0) && currentHourMin < toMinutes(13, 30);

  return (
    <div className="flex flex-col min-h-screen">
      <PageHero title="Werktijden" subtitle="Inkloktijden registratie en overzicht" />
      <div className="flex-1 p-6 space-y-6">

        {/* Clock in/out kaart */}
        {!(user as any)?.kadasterId ? (
          <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
            <CardContent className="p-4 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              <span className="text-sm text-amber-800 dark:text-amber-200">
                Uw account heeft geen Userid. Neem contact op met de beheerder.
              </span>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Mijn Klokstatus — {format(new Date(), "EEEE d MMMM yyyy", { locale: nl })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className={`h-3 w-3 rounded-full ${isClockedIn ? "bg-green-500 animate-pulse" : "bg-slate-300"}`} />
                  <span className="text-sm font-medium">
                    {isClockedIn
                      ? `Ingeklokt om ${formatChecktime(lastTodayRecord!.checktime).slice(11, 19)}`
                      : "Niet ingeklokt"}
                  </span>
                </div>
                {isBreakTime && (
                  <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100 text-xs">
                    Verplichte pauze (12:00–13:30)
                  </Badge>
                )}
                <div className="flex gap-2 sm:ml-auto">
                  <Button
                    onClick={() => clockMutation.mutate("in")}
                    disabled={clockMutation.isPending || isClockedIn}
                    className="bg-green-600 hover:bg-green-700 text-white"
                    data-testid="button-clock-in"
                  >
                    {clockMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <LogIn className="h-4 w-4 mr-2" />}
                    Inklokken
                  </Button>
                  <Button
                    onClick={() => clockMutation.mutate("out")}
                    disabled={clockMutation.isPending || !isClockedIn}
                    variant="destructive"
                    data-testid="button-clock-out"
                  >
                    {clockMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <LogOut className="h-4 w-4 mr-2" />}
                    Uitklokken
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Werktijden: Ma–Do 7:30–12:00 en 13:30–17:00 | Vrijdag 7:30–12:00 en 13:30–16:30
                &nbsp;·&nbsp; Inklokken vóór 7:00 wordt als 7:00 geregistreerd &nbsp;·&nbsp; Uitklokken na 17:00 wordt als 17:00 geregistreerd (tenzij overuren goedgekeurd)
              </p>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="mijn">
          <TabsList>
            <TabsTrigger value="mijn" data-testid="tab-mijn-werktijden">
              <Clock className="h-4 w-4 mr-1.5" />
              Mijn Werktijden
            </TabsTrigger>
            {isManager && (
              <TabsTrigger value="overzicht" data-testid="tab-overzicht-werktijden">
                <Users className="h-4 w-4 mr-1.5" />
                Overzicht Medewerkers
              </TabsTrigger>
            )}
            <TabsTrigger value="overuren" data-testid="tab-overuren">
              <CalendarDays className="h-4 w-4 mr-1.5" />
              Overuren
            </TabsTrigger>
          </TabsList>

          {/* Mijn werktijden tab */}
          <TabsContent value="mijn" className="space-y-4 mt-4">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Laden…</div>
            ) : myDagSamenvattingen.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground">
                  Nog geen werktijden geregistreerd.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {myDagSamenvattingen.map((dag) => (
                  <Card key={dag.datum} className="overflow-hidden">
                    <CardHeader className="py-3 px-4 bg-muted/30 flex flex-row items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold capitalize">{dag.weekdag} {format(new Date(dag.datum + "T00:00:00"), "d MMMM yyyy", { locale: nl })}</span>
                        <StatusBadge status={dag.status} />
                      </div>
                      <div className="text-sm font-medium">
                        {dag.eersteIn && dag.lastUit ? (
                          <span>
                            {format(dag.eersteIn, "HH:mm")} → {format(dag.lastUit, "HH:mm")}
                            &nbsp;·&nbsp; <span className="text-primary">{formatMinuten(dag.werkminuten)}</span>
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">Onvolledig</span>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="pl-4">Log ID</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Tijdstip</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dag.records.map(r => (
                            <TableRow key={r.logid}>
                              <TableCell className="pl-4 text-muted-foreground text-xs">{r.logid}</TableCell>
                              <TableCell>
                                <Badge variant={r.checktype === "in" ? "default" : "secondary"} className="text-xs">
                                  {r.checktype === "in" ? "Inklok" : "Uitklok"}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-mono text-sm">{formatChecktime(r.checktime)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Overzicht alle medewerkers (manager/admin) */}
          {isManager && (
            <TabsContent value="overzicht" className="space-y-4 mt-4">
              <div className="flex items-center gap-3">
                <Select value={filterUserid} onValueChange={setFilterUserid}>
                  <SelectTrigger className="w-64" data-testid="select-filter-userid">
                    <SelectValue placeholder="Filter medewerker…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle medewerkers</SelectItem>
                    {activeUsers.map((u: any) => (
                      <SelectItem key={u.kadasterId} value={u.kadasterId}>
                        {u.fullName || u.username} (ID: {u.kadasterId})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {Object.keys(overviewByUser).length === 0 ? (
                <Card>
                  <CardContent className="py-10 text-center text-muted-foreground">
                    Geen werktijden gevonden.
                  </CardContent>
                </Card>
              ) : (
                Object.entries(overviewByUser).map(([uid, recs]) => {
                  const userOveruurDagen = new Set(
                    overuurAanvragen.filter(a => a.status === "goedgekeurd" && a.userid === uid).map(a => a.datum)
                  );
                  const dagSamenvattingen = buildDagSamenvattingen(recs, userOveruurDagen);
                  return (
                    <Card key={uid} className="overflow-hidden">
                      <CardHeader className="py-3 px-4 bg-primary/5 flex flex-row items-center gap-3">
                        <Users className="h-4 w-4 text-primary" />
                        <span className="font-semibold">{getUserName(uid)}</span>
                        <Badge variant="outline" className="text-xs">ID: {uid}</Badge>
                      </CardHeader>
                      <CardContent className="p-0">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="pl-4">Log ID</TableHead>
                              <TableHead>Datum</TableHead>
                              <TableHead>Weekdag</TableHead>
                              <TableHead>Type</TableHead>
                              <TableHead>Tijdstip</TableHead>
                              <TableHead>Daguren</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right pr-4">Acties</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {dagSamenvattingen.map(dag =>
                              dag.records.map((r, i) => (
                                <TableRow key={r.logid}>
                                  <TableCell className="pl-4 text-muted-foreground text-xs">{r.logid}</TableCell>
                                  <TableCell className="text-sm">{format(new Date(dag.datum + "T00:00:00"), "dd-MM-yyyy")}</TableCell>
                                  <TableCell className="text-sm capitalize">{dag.weekdag}</TableCell>
                                  <TableCell>
                                    <Badge variant={r.checktype === "in" ? "default" : "secondary"} className="text-xs">
                                      {r.checktype === "in" ? "Inklok" : "Uitklok"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="font-mono text-sm">{formatChecktime(r.checktime)}</TableCell>
                                  {i === 0 ? (
                                    <>
                                      <TableCell rowSpan={dag.records.length} className="align-middle font-medium text-primary text-sm">
                                        {dag.werkminuten > 0 ? formatMinuten(dag.werkminuten) : "—"}
                                      </TableCell>
                                      <TableCell rowSpan={dag.records.length} className="align-middle">
                                        <StatusBadge status={dag.status} />
                                      </TableCell>
                                    </>
                                  ) : null}
                                  <TableCell className="text-right pr-4">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                      onClick={() => deleteMutation.mutate(r.logid)}
                                      data-testid={`button-delete-record-${r.logid}`}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </TabsContent>
          )}

          {/* Overuren tab */}
          <TabsContent value="overuren" className="space-y-4 mt-4">
            {isManager && (
              <div className="flex justify-end">
                <Button onClick={() => setOveruurOpen(true)} data-testid="button-new-overuur">
                  <Plus className="h-4 w-4 mr-2" />
                  Overuur Aanvragen
                </Button>
              </div>
            )}

            {overuurAanvragen.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground">
                  Geen overuur aanvragen gevonden.
                </CardContent>
              </Card>
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-4">Medewerker (Userid)</TableHead>
                      <TableHead>Datum</TableHead>
                      <TableHead>Reden</TableHead>
                      <TableHead>Aangevraagd door</TableHead>
                      <TableHead>Status</TableHead>
                      {isDirecteur && <TableHead className="text-right pr-4">Acties</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overuurAanvragen.map(a => (
                      <TableRow key={a.id} data-testid={`row-overuur-${a.id}`}>
                        <TableCell className="pl-4 font-medium">
                          {isManager ? <>{getUserName(a.userid)} <span className="text-muted-foreground text-xs">({a.userid})</span></> : a.userid}
                        </TableCell>
                        <TableCell>{a.datum ? format(new Date(a.datum + "T00:00:00"), "dd-MM-yyyy") : "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{a.reden || "—"}</TableCell>
                        <TableCell className="text-sm">
                          {a.aangevraagdDoor ? (
                            <span className="text-muted-foreground text-xs">{a.aangevraagdDoor.slice(0, 8)}…</span>
                          ) : "—"}
                        </TableCell>
                        <TableCell>
                          {a.status === "goedgekeurd" && <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"><CheckCircle className="h-3 w-3 mr-1" />Goedgekeurd</Badge>}
                          {a.status === "afgewezen" && <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"><XCircle className="h-3 w-3 mr-1" />Afgewezen</Badge>}
                          {a.status === "aangevraagd" && <Badge variant="outline"><AlertCircle className="h-3 w-3 mr-1" />Aangevraagd</Badge>}
                        </TableCell>
                        {isDirecteur && (
                          <TableCell className="text-right pr-4">
                            {a.status === "aangevraagd" && (
                              <div className="flex gap-2 justify-end">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-green-700 border-green-300 hover:bg-green-50 h-7 text-xs"
                                  onClick={() => overuurBeoordeelMutation.mutate({ id: a.id, status: "goedgekeurd" })}
                                  data-testid={`button-approve-overuur-${a.id}`}
                                >
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Goedkeuren
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-700 border-red-300 hover:bg-red-50 h-7 text-xs"
                                  onClick={() => overuurBeoordeelMutation.mutate({ id: a.id, status: "afgewezen" })}
                                  data-testid={`button-reject-overuur-${a.id}`}
                                >
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Afwijzen
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Overuur aanvraag dialog */}
      <Dialog open={overuurOpen} onOpenChange={setOveruurOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Overuur Aanvragen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="overuur-userid">Medewerker</Label>
              <Select value={overuurForm.userid} onValueChange={v => setOveruurForm(f => ({ ...f, userid: v }))}>
                <SelectTrigger id="overuur-userid" data-testid="select-overuur-userid">
                  <SelectValue placeholder="Selecteer medewerker…" />
                </SelectTrigger>
                <SelectContent>
                  {activeUsers.map((u: any) => (
                    <SelectItem key={u.kadasterId} value={u.kadasterId}>
                      {u.fullName || u.username} (ID: {u.kadasterId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="overuur-datum">Datum</Label>
              <Input
                id="overuur-datum"
                type="date"
                value={overuurForm.datum}
                onChange={e => setOveruurForm(f => ({ ...f, datum: e.target.value }))}
                data-testid="input-overuur-datum"
              />
            </div>
            <div>
              <Label htmlFor="overuur-reden">Reden</Label>
              <Textarea
                id="overuur-reden"
                value={overuurForm.reden}
                onChange={e => setOveruurForm(f => ({ ...f, reden: e.target.value }))}
                placeholder="Omschrijf de reden voor overuren…"
                data-testid="input-overuur-reden"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setOveruurOpen(false)}>Annuleren</Button>
              <Button
                onClick={() => overuurMutation.mutate(overuurForm)}
                disabled={!overuurForm.userid || !overuurForm.datum || overuurMutation.isPending}
                data-testid="button-submit-overuur"
              >
                {overuurMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Indienen bij Directie
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
