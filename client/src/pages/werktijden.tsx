import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
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
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Upload, Database, FileText, AlertTriangle, CheckCircle2,
  XCircle, Info, Users, Clock, Layers, RefreshCw, Trash2,
  FileUp, Filter, Search, Calendar,
} from "lucide-react";
import type { User } from "@shared/schema";

// ── Types ─────────────────────────────────────────────────────────────────────
type Werktijd = {
  logid: number;
  userid: string;
  checktime: string;
  checktype: string;
};

type ImportLogEntry = {
  id: string;
  importedAt: string;
  importedBy: string | null;
  bestandsnaam: string | null;
  totaalRecords: number;
  geldigeRecords: number;
  foutRecords: number;
  waarschuwingen: number;
  status: string;
};

type EventLog = {
  id: number;
  eventAt: string;
  importId: string | null;
  eventType: string;
  userid: string | null;
  checktime: string | null;
  bericht: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function parseChecktime(ct: string): Date {
  if (ct.includes("T")) return new Date(ct);
  return new Date(ct.replace(" ", "T"));
}

function formatTs(ct: string): string {
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

function toMinutes(h: number, m: number) { return h * 60 + m; }

function calcWerkminuten(inTime: Date, outTime: Date, isFriday: boolean): number {
  const effectiveIn  = Math.max(toMinutes(inTime.getHours(), inTime.getMinutes()), toMinutes(7, 0));
  const maxOut       = toMinutes(isFriday ? 16 : 17, isFriday ? 30 : 0);
  const effectiveOut = Math.min(toMinutes(outTime.getHours(), outTime.getMinutes()), maxOut);
  if (effectiveOut <= effectiveIn) return 0;
  const breakStart = toMinutes(12, 0);
  const breakEnd   = toMinutes(13, 30);
  let worked = effectiveOut - effectiveIn;
  const overlapStart = Math.max(effectiveIn, breakStart);
  const overlapEnd   = Math.min(effectiveOut, breakEnd);
  if (overlapEnd > overlapStart) worked -= (overlapEnd - overlapStart);
  return Math.max(0, worked);
}

function formatMinuten(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}u ${m.toString().padStart(2, "0")}m`;
}

// ── Sessie berekening ─────────────────────────────────────────────────────────
type Sessie = {
  userid: string;
  datum: string;
  weekdag: string;
  eersteIn: Date | null;
  lastUit: Date | null;
  aantalRecords: number;
  werkminuten: number;
  status: "volledig" | "te_laat" | "te_vroeg_uit" | "onvolledig" | "overuur";
};

function buildSessies(records: Werktijd[]): Sessie[] {
  const byUserDay: Record<string, Werktijd[]> = {};
  for (const r of records) {
    const key = `${r.userid}::${dateKey(r.checktime)}`;
    if (!byUserDay[key]) byUserDay[key] = [];
    byUserDay[key].push(r);
  }
  return Object.entries(byUserDay)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([key, recs]) => {
      const [userid, datum] = key.split("::");
      const sorted  = [...recs].sort((a, b) => parseChecktime(a.checktime).getTime() - parseChecktime(b.checktime).getTime());
      const ins     = sorted.filter(r => r.checktype === "in").map(r => parseChecktime(r.checktime));
      const outs    = sorted.filter(r => r.checktype === "out").map(r => parseChecktime(r.checktime));
      const eersteIn = ins.length  > 0 ? ins[0]  : null;
      const lastUit  = outs.length > 0 ? outs[outs.length - 1] : null;
      const d        = new Date(datum + "T00:00:00");
      const isFriday = d.getDay() === 5;
      let werkminuten = 0;
      if (eersteIn && lastUit) werkminuten = calcWerkminuten(eersteIn, lastUit, isFriday);
      const inM   = eersteIn ? eersteIn.getHours() * 60 + eersteIn.getMinutes()  : 0;
      const outM  = lastUit  ? lastUit.getHours()  * 60 + lastUit.getMinutes()   : 0;
      let status: Sessie["status"] = "onvolledig";
      if (eersteIn && lastUit) {
        if (outM > toMinutes(18, 0))                                 status = "overuur";
        else if (inM > toMinutes(8, 0))                              status = "te_laat";
        else if (outM < toMinutes(isFriday ? 16 : 17, isFriday ? 15 : 0)) status = "te_vroeg_uit";
        else                                                         status = "volledig";
      }
      const weekdag = format(d, "EEEE", { locale: nl });
      return { userid, datum, weekdag, eersteIn, lastUit, aantalRecords: sorted.length, werkminuten, status };
    });
}

// ── Status badges ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  if (status === "volledig")    return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 text-xs">Volledig</Badge>;
  if (status === "te_laat")     return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100 text-xs">Te laat</Badge>;
  if (status === "te_vroeg_uit") return <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100 text-xs">Vroeg uit</Badge>;
  if (status === "overuur")     return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100 text-xs">Overuren</Badge>;
  return <Badge variant="outline" className="text-xs">Onvolledig</Badge>;
}

function ImportStatusBadge({ status }: { status: string }) {
  if (status === "verwerkt")            return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 text-xs">Verwerkt</Badge>;
  if (status === "verwerkt_met_fouten") return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100 text-xs">Met waarschuwingen</Badge>;
  return <Badge variant="outline" className="text-xs">{status}</Badge>;
}

function EventTypeBadge({ type }: { type: string }) {
  if (type === "error")   return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100 text-xs">Fout</Badge>;
  if (type === "warning") return <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100 text-xs">Waarschuwing</Badge>;
  return <Badge className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 text-xs">Info</Badge>;
}

// ── Hoofdcomponent ────────────────────────────────────────────────────────────
export default function WerktijdenPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isManager = isAdminRole(user?.role) || user?.role === "manager" || user?.role === "manager_az";

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [filterUserid, setFilterUserid] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDatum, setFilterDatum] = useState("");
  const [selectedImportId, setSelectedImportId] = useState<string | null>(null);

  const { data: records = [], isLoading: recordsLoading } = useQuery<Werktijd[]>({
    queryKey: ["/api/werktijden"],
  });

  const { data: importLogs = [], isLoading: logsLoading } = useQuery<ImportLogEntry[]>({
    queryKey: ["/api/import-logs"],
    enabled: isManager,
  });

  const { data: eventLogs = [], isLoading: eventsLoading } = useQuery<EventLog[]>({
    queryKey: ["/api/prikklok-events", selectedImportId],
    queryFn: async () => {
      const url = selectedImportId
        ? `/api/prikklok-events?importId=${selectedImportId}&limit=500`
        : `/api/prikklok-events?limit=200`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    enabled: isManager,
  });

  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: isManager,
  });

  const activeUsers = (allUsers as any[]).filter((u: any) => u.active && u.kadasterId);

  const deleteMutation = useMutation({
    mutationFn: async (logid: number) => {
      const res = await fetch(`/api/werktijden/${logid}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/werktijden"] });
      toast({ title: "Record verwijderd" });
    },
    onError: (err: any) => toast({ title: "Fout", description: err.message, variant: "destructive" }),
  });

  const getUserName = (kadasterId: string) => {
    const u = activeUsers.find((u: any) => u.kadasterId === kadasterId);
    return u ? ((u as any).fullName || u.username) : kadasterId;
  };

  // ── Upload ──────────────────────────────────────────────────────────────────
  async function handleFileUpload(file: File) {
    if (!file) return;
    setUploading(true);
    setUploadProgress(10);
    try {
      const formData = new FormData();
      formData.append("bestand", file);
      setUploadProgress(40);
      const res = await fetch("/api/werktijden/import", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      setUploadProgress(80);
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Import mislukt");
      setUploadProgress(100);
      queryClient.invalidateQueries({ queryKey: ["/api/werktijden"] });
      queryClient.invalidateQueries({ queryKey: ["/api/import-logs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/prikklok-events"] });
      toast({
        title: `Import voltooid — ${file.name}`,
        description: `${data.geldigeRecords} records geldig · ${data.foutRecords} fouten · ${data.waarschuwingen} waarschuwingen`,
      });
    } catch (err: any) {
      toast({ title: "Import mislukt", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  // ── Sessies ─────────────────────────────────────────────────────────────────
  const sessies = useMemo(() => buildSessies(records), [records]);

  const filteredSessies = useMemo(() => {
    return sessies.filter(s => {
      if (filterUserid !== "all" && s.userid !== filterUserid) return false;
      if (filterDatum && !s.datum.includes(filterDatum)) return false;
      if (searchTerm) {
        const name = getUserName(s.userid).toLowerCase();
        if (!name.includes(searchTerm.toLowerCase()) && !s.userid.includes(searchTerm)) return false;
      }
      return true;
    });
  }, [sessies, filterUserid, filterDatum, searchTerm]);

  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      if (filterUserid !== "all" && r.userid !== filterUserid) return false;
      if (filterDatum && !dateKey(r.checktime).includes(filterDatum)) return false;
      if (searchTerm) {
        const name = getUserName(r.userid).toLowerCase();
        if (!name.includes(searchTerm.toLowerCase()) && !r.userid.includes(searchTerm)) return false;
      }
      return true;
    });
  }, [records, filterUserid, filterDatum, searchTerm]);

  const filteredEvents = useMemo(() => {
    if (!searchTerm) return eventLogs;
    return eventLogs.filter(e =>
      e.bericht.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.userid && e.userid.includes(searchTerm))
    );
  }, [eventLogs, searchTerm]);

  // ── KPI statistieken ─────────────────────────────────────────────────────────
  const today = format(new Date(), "yyyy-MM-dd");
  const totalSessies = sessies.length;
  const totalRecords = records.length;
  const totalWarnings = eventLogs.filter(e => e.eventType === "warning").length;
  const totalErrors   = eventLogs.filter(e => e.eventType === "error").length;
  const lastImport    = importLogs.length > 0 ? importLogs[0] : null;
  const todaySessies  = sessies.filter(s => s.datum === today).length;

  // ── Validatiestatus ──────────────────────────────────────────────────────────
  const validationIssues = useMemo(() => {
    return sessies.filter(s => s.status === "onvolledig").length;
  }, [sessies]);

  if (!isManager) {
    return (
      <div className="flex flex-col min-h-screen">
        <PageHero title="Werktijden" subtitle="Prikklok data import & verwerking" imageSrc="/uploads/App_pics/werktijden.png" />
        <div className="flex-1 p-6">
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Database className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>U heeft geen toegang tot dit module.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <PageHero title="Werktijden" subtitle="Prikklok data import & verwerking" imageSrc="/uploads/App_pics/werktijden.png" />
      <div className="flex-1 p-6 space-y-6">

        {/* KPI kaarten */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30">
                  <Database className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Totaal records</p>
                  <p className="text-2xl font-bold" data-testid="stat-total-records">{totalRecords}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-50 dark:bg-green-950/30">
                  <Layers className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Sessies</p>
                  <p className="text-2xl font-bold" data-testid="stat-total-sessies">{totalSessies}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Waarschuwingen</p>
                  <p className="text-2xl font-bold" data-testid="stat-warnings">{totalWarnings}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/30">
                  <FileUp className="h-5 w-5 text-slate-600 dark:text-slate-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Laatste import</p>
                  <p className="text-sm font-semibold truncate max-w-[120px]" data-testid="stat-last-import">
                    {lastImport ? format(new Date(lastImport.importedAt), "dd-MM HH:mm", { locale: nl }) : "—"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="import">
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="import" data-testid="tab-import">
              <Upload className="h-4 w-4 mr-1.5" />
              Import
            </TabsTrigger>
            <TabsTrigger value="registraties" data-testid="tab-registraties">
              <Database className="h-4 w-4 mr-1.5" />
              Registraties
              {totalRecords > 0 && <Badge className="ml-1.5 text-xs px-1.5 py-0">{totalRecords}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="sessies" data-testid="tab-sessies">
              <Layers className="h-4 w-4 mr-1.5" />
              Sessies
              {totalSessies > 0 && <Badge className="ml-1.5 text-xs px-1.5 py-0">{totalSessies}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="logboek" data-testid="tab-logboek">
              <FileText className="h-4 w-4 mr-1.5" />
              Logboek
              {(totalWarnings + totalErrors) > 0 && (
                <Badge className="ml-1.5 text-xs px-1.5 py-0 bg-amber-100 text-amber-800">
                  {totalWarnings + totalErrors}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ── Import tab ──────────────────────────────────────────────────── */}
          <TabsContent value="import" className="space-y-5 mt-4">
            {/* Upload zone */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Upload className="h-5 w-5 text-primary" />
                  Prikklokdata importeren
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(false);
                    const file = e.dataTransfer.files[0];
                    if (file) handleFileUpload(file);
                  }}
                  onClick={() => !uploading && fileInputRef.current?.click()}
                  className={`
                    border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors
                    ${dragOver
                      ? "border-primary bg-primary/5"
                      : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/30"
                    }
                    ${uploading ? "pointer-events-none opacity-60" : ""}
                  `}
                  data-testid="dropzone-csv"
                >
                  <FileUp className={`h-10 w-10 mx-auto mb-3 ${dragOver ? "text-primary" : "text-muted-foreground/50"}`} />
                  <p className="font-medium text-sm">
                    {uploading ? "Bezig met verwerken…" : "Sleep een CSV-bestand hierheen of klik om te uploaden"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Ondersteunde kolommen: userid/pin, checktime/datetime, checktype/type (optioneel)
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  className="hidden"
                  data-testid="input-csv-file"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                />
                {uploading && (
                  <div className="space-y-1.5">
                    <Progress value={uploadProgress} className="h-2" />
                    <p className="text-xs text-muted-foreground text-center">Verwerken…</p>
                  </div>
                )}

                {/* CSV formaat uitleg */}
                <div className="rounded-lg bg-muted/40 p-4 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Verwacht CSV-formaat</p>
                  <div className="grid md:grid-cols-2 gap-3 text-xs text-muted-foreground">
                    <div>
                      <p className="font-medium mb-1">Met checktype kolom:</p>
                      <code className="block bg-background border rounded p-2 font-mono text-xs leading-relaxed">
                        userid,checktime,checktype<br />
                        1,2025-01-15 08:03:00,in<br />
                        1,2025-01-15 17:02:00,out
                      </code>
                    </div>
                    <div>
                      <p className="font-medium mb-1">Zonder checktype (alternerend):</p>
                      <code className="block bg-background border rounded p-2 font-mono text-xs leading-relaxed">
                        pin;datetime<br />
                        001;15/01/2025 08:03:00<br />
                        001;15/01/2025 17:02:00
                      </code>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Separator: komma (,) of puntkomma (;) · Datum: ISO 8601, dd/mm/yyyy of dd-mm-yyyy · Checktype: in/out, 0/1, C/I/C/O
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Import geschiedenis */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2 justify-between">
                  <span className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    Importgeschiedenis
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/import-logs"] })}
                    data-testid="button-refresh-imports"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {logsLoading ? (
                  <div className="py-8 text-center text-muted-foreground text-sm">Laden…</div>
                ) : importLogs.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground text-sm">
                    <Upload className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    Nog geen imports uitgevoerd
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="pl-4">Bestand</TableHead>
                        <TableHead>Tijdstip</TableHead>
                        <TableHead className="text-right">Totaal</TableHead>
                        <TableHead className="text-right">Geldig</TableHead>
                        <TableHead className="text-right">Fouten</TableHead>
                        <TableHead className="text-right pr-4">Waarschuw.</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importLogs.map((log) => (
                        <TableRow
                          key={log.id}
                          className={`cursor-pointer transition-colors ${selectedImportId === log.id ? "bg-primary/5" : "hover:bg-muted/30"}`}
                          onClick={() => setSelectedImportId(selectedImportId === log.id ? null : log.id)}
                          data-testid={`row-import-${log.id}`}
                        >
                          <TableCell className="pl-4 font-medium text-sm">{log.bestandsnaam || "—"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{formatTs(log.importedAt)}</TableCell>
                          <TableCell className="text-right text-sm">{log.totaalRecords}</TableCell>
                          <TableCell className="text-right text-sm text-green-700 dark:text-green-400">{log.geldigeRecords}</TableCell>
                          <TableCell className="text-right text-sm text-red-700 dark:text-red-400">{log.foutRecords}</TableCell>
                          <TableCell className="text-right text-sm text-amber-700 dark:text-amber-400 pr-4">{log.waarschuwingen}</TableCell>
                          <TableCell><ImportStatusBadge status={log.status} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Registraties tab ─────────────────────────────────────────────── */}
          <TabsContent value="registraties" className="space-y-4 mt-4">
            <div className="flex flex-wrap gap-2 items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9 w-48"
                  placeholder="Zoek medewerker…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  data-testid="input-search-registraties"
                />
              </div>
              <Select value={filterUserid} onValueChange={setFilterUserid}>
                <SelectTrigger className="w-52" data-testid="select-filter-userid">
                  <Filter className="h-4 w-4 mr-1.5 text-muted-foreground" />
                  <SelectValue placeholder="Medewerker…" />
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
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  className="pl-9 w-44"
                  value={filterDatum}
                  onChange={(e) => setFilterDatum(e.target.value)}
                  data-testid="input-filter-datum"
                />
              </div>
              <span className="text-sm text-muted-foreground ml-1">
                {filteredRecords.length} records
              </span>
            </div>

            <Card className="overflow-hidden">
              {recordsLoading ? (
                <CardContent className="py-10 text-center text-muted-foreground">Laden…</CardContent>
              ) : filteredRecords.length === 0 ? (
                <CardContent className="py-10 text-center text-muted-foreground">
                  <Database className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  Geen registraties gevonden
                </CardContent>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-4">Log ID</TableHead>
                      <TableHead>Userid</TableHead>
                      <TableHead>Medewerker</TableHead>
                      <TableHead>Datum</TableHead>
                      <TableHead>Tijdstip</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right pr-4">Acties</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecords.slice(0, 500).map((r) => (
                      <TableRow key={r.logid} data-testid={`row-reg-${r.logid}`}>
                        <TableCell className="pl-4 text-xs text-muted-foreground">{r.logid}</TableCell>
                        <TableCell className="text-xs font-mono">{r.userid}</TableCell>
                        <TableCell className="text-sm">{getUserName(r.userid)}</TableCell>
                        <TableCell className="text-sm">{dateKey(r.checktime).split("-").reverse().join("-")}</TableCell>
                        <TableCell className="font-mono text-sm">{formatTs(r.checktime).slice(11)}</TableCell>
                        <TableCell>
                          <Badge
                            variant={r.checktype === "in" ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {r.checktype === "in" ? "Inklok" : "Uitklok"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-4">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => deleteMutation.mutate(r.logid)}
                            disabled={deleteMutation.isPending}
                            data-testid={`button-delete-reg-${r.logid}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
            {filteredRecords.length > 500 && (
              <p className="text-xs text-center text-muted-foreground">
                Toont 500 van {filteredRecords.length} records. Gebruik filters om te verfijnen.
              </p>
            )}
          </TabsContent>

          {/* ── Sessies tab ──────────────────────────────────────────────────── */}
          <TabsContent value="sessies" className="space-y-4 mt-4">
            <div className="flex flex-wrap gap-2 items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9 w-48"
                  placeholder="Zoek medewerker…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  data-testid="input-search-sessies"
                />
              </div>
              <Select value={filterUserid} onValueChange={setFilterUserid}>
                <SelectTrigger className="w-52" data-testid="select-filter-sessies">
                  <Users className="h-4 w-4 mr-1.5 text-muted-foreground" />
                  <SelectValue placeholder="Medewerker…" />
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
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  className="pl-9 w-44"
                  value={filterDatum}
                  onChange={(e) => setFilterDatum(e.target.value)}
                  data-testid="input-filter-datum-sessies"
                />
              </div>
              <span className="text-sm text-muted-foreground ml-1">
                {filteredSessies.length} sessies
              </span>
              {validationIssues > 0 && (
                <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100 text-xs">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {validationIssues} onvolledig
                </Badge>
              )}
            </div>

            <Card className="overflow-hidden">
              {recordsLoading ? (
                <CardContent className="py-10 text-center text-muted-foreground">Laden…</CardContent>
              ) : filteredSessies.length === 0 ? (
                <CardContent className="py-10 text-center text-muted-foreground">
                  <Layers className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  Geen sessies gevonden
                </CardContent>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-4">Medewerker</TableHead>
                      <TableHead>ID</TableHead>
                      <TableHead>Datum</TableHead>
                      <TableHead>Weekdag</TableHead>
                      <TableHead>Eerste inklok</TableHead>
                      <TableHead>Laatste uitklok</TableHead>
                      <TableHead className="text-right">Werktijd</TableHead>
                      <TableHead>Records</TableHead>
                      <TableHead className="pr-4">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSessies.slice(0, 500).map((s) => (
                      <TableRow key={`${s.userid}::${s.datum}`} data-testid={`row-sessie-${s.userid}-${s.datum}`}>
                        <TableCell className="pl-4 text-sm font-medium">{getUserName(s.userid)}</TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">{s.userid}</TableCell>
                        <TableCell className="text-sm">{s.datum.split("-").reverse().join("-")}</TableCell>
                        <TableCell className="text-sm capitalize">{s.weekdag}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {s.eersteIn ? format(s.eersteIn, "HH:mm:ss") : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {s.lastUit ? format(s.lastUit, "HH:mm:ss") : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-primary text-sm">
                          {s.werkminuten > 0 ? formatMinuten(s.werkminuten) : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="text-sm text-center">{s.aantalRecords}</TableCell>
                        <TableCell className="pr-4"><StatusBadge status={s.status} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </TabsContent>

          {/* ── Logboek tab ──────────────────────────────────────────────────── */}
          <TabsContent value="logboek" className="space-y-4 mt-4">
            <div className="flex flex-wrap gap-2 items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9 w-48"
                  placeholder="Zoek in logboek…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  data-testid="input-search-logboek"
                />
              </div>
              {selectedImportId && (
                <Badge
                  className="bg-primary/10 text-primary cursor-pointer hover:bg-primary/20"
                  onClick={() => setSelectedImportId(null)}
                  data-testid="badge-filter-import"
                >
                  Filter: import actief · ✕
                </Badge>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/prikklok-events"] })}
                data-testid="button-refresh-events"
              >
                <RefreshCw className="h-4 w-4 mr-1.5" />
                Vernieuwen
              </Button>
              <div className="ml-auto flex gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Info className="h-3.5 w-3.5" /> {eventLogs.filter(e => e.eventType === "info").length} info</span>
                <span className="flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> {totalWarnings} waarsch.</span>
                <span className="flex items-center gap-1"><XCircle className="h-3.5 w-3.5 text-red-500" /> {totalErrors} fouten</span>
              </div>
            </div>

            <Card className="overflow-hidden">
              {eventsLoading ? (
                <CardContent className="py-10 text-center text-muted-foreground">Laden…</CardContent>
              ) : filteredEvents.length === 0 ? (
                <CardContent className="py-10 text-center text-muted-foreground">
                  <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  Geen events gevonden
                </CardContent>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="pl-4">Type</TableHead>
                      <TableHead>Tijdstip</TableHead>
                      <TableHead>Userid</TableHead>
                      <TableHead>Checktime</TableHead>
                      <TableHead className="pr-4">Bericht</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEvents.slice(0, 500).map((e) => (
                      <TableRow
                        key={e.id}
                        className={
                          e.eventType === "error"   ? "bg-red-50/50 dark:bg-red-950/10" :
                          e.eventType === "warning" ? "bg-amber-50/50 dark:bg-amber-950/10" : ""
                        }
                        data-testid={`row-event-${e.id}`}
                      >
                        <TableCell className="pl-4"><EventTypeBadge type={e.eventType} /></TableCell>
                        <TableCell className="text-xs text-muted-foreground font-mono">{formatTs(e.eventAt)}</TableCell>
                        <TableCell className="text-xs font-mono">{e.userid || "—"}</TableCell>
                        <TableCell className="text-xs font-mono">{e.checktime ? formatTs(e.checktime) : "—"}</TableCell>
                        <TableCell className="pr-4 text-sm">{e.bericht}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
            {filteredEvents.length > 500 && (
              <p className="text-xs text-center text-muted-foreground">
                Toont 500 van {filteredEvents.length} events.
              </p>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
