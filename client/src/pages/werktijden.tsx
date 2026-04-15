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
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Upload, Database, FileText, AlertTriangle, CheckCircle2,
  XCircle, Info, Users, Clock, Layers, RefreshCw, Trash2,
  FileUp, Filter, Search, Calendar, BarChart3, TrendingUp,
  TrendingDown, CoffeeIcon, ClockAlert, ShieldAlert, LogOut, Send, Building2,
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
  // DB slaat tijden op als lokale tijd (naive timestamp).
  // De server serialiseert met Z (UTC). Strip de Z zodat de browser
  // de tijd als lokale (display) tijd interpreteert, zonder uur-aftrek.
  const s = ct.replace(/Z$/, "").replace(" ", "T");
  return new Date(s);
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

// ── Analyse constanten (bloktijden in seconden) ───────────────────────────────
const _H = 3600, _M = 60;
const ANA_BLK1_S  = 7*_H;              // 07:00
const ANA_BLK1_E  = 8*_H;              // 08:00
const ANA_BLK2_S  = 11*_H+45*_M;      // 11:45
const ANA_BLK2_E  = 12*_H;             // 12:00
const ANA_BLK3_S  = 13*_H+30*_M;      // 13:30
const ANA_BLK3_E  = 14*_H;             // 14:00
const ANA_BLK4_WD = 16*_H+45*_M;      // 16:45 Ma-Do
const ANA_BLK4_FR = 16*_H+30*_M;      // 16:30 Vr
const ANA_BLK4_E  = 18*_H;             // 18:00
const ANA_BREAK_S = 12*_H;             // 12:00 pauze start
const ANA_BREAK_E = 13*_H+30*_M;       // 13:30 pauze einde
const ANA_TARGET_WD = 8*_H;            // 8u target Ma-Do
const ANA_TARGET_FR = 7*_H+30*_M;      // 7.5u target Vr
const ANA_PAUZE_OUT_MIN = 11*_H+30*_M; // vroegste uitklok pauze
const ANA_PAUZE_OUT_MAX = 13*_H+30*_M; // laatste uitklok pauze
const ANA_PAUZE_IN_MIN  = 12*_H;       // vroegste inklok pauze
const ANA_PAUZE_IN_MAX  = 15*_H;       // laatste inklok pauze

// ── Analyse types ─────────────────────────────────────────────────────────────
type WorkPair = {
  inRec: Werktijd;
  outRec: Werktijd | null;
  inTime: Date;
  outTime: Date | null;
  durSec: number | null;
  werktijdSec: number | null;
};

type PauzePair = {
  outRec: Werktijd;
  inRec: Werktijd;
  outTime: Date;
  inTime: Date;
  durSec: number;
};

type DagAnalyse = {
  datum: string;
  dagStr: string;
  weekdagKort: string;
  isFriday: boolean;
  pairs: WorkPair[];
  completePairs: WorkPair[];
  incompletePairs: WorkPair[];
  pauze: PauzePair | null;
  totaalWerktijdSec: number;
  targetSec: number;
  verschilSec: number;
  blok1Ok: boolean;
  blok2Ok: boolean;
  blok3Ok: boolean;
  blok4Ok: boolean;
  teLaat:     Array<{ rec: Werktijd; tijd: string }>;
  teVroegIn:  Array<{ rec: Werktijd; tijd: string }>; // IN vóór 07:00
  teVroegUit: Array<{ rec: Werktijd; tijd: string }>; // OUT vóór blok4, zonder goedgekeurde absence
  isAbsent: boolean;
};

type AbsenceRecord = {
  id: number;
  userId: number;
  startDate: string;
  endDate: string;
  status: string;
  type: string;
};

// ── Analyse helpers ───────────────────────────────────────────────────────────
function secOfDay(d: Date): number {
  return d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
}

function formatHMS(sec: number): string {
  const abs = Math.abs(Math.round(sec));
  const h   = Math.floor(abs / 3600);
  const m   = Math.floor((abs % 3600) / 60);
  const s   = abs % 60;
  return `${h.toString().padStart(2,"0")}:${m.toString().padStart(2,"0")}:${s.toString().padStart(2,"0")}`;
}

function formatTime12(d: Date): string {
  const h24 = d.getHours();
  const h   = h24 % 12 === 0 ? 12 : h24 % 12;
  const m   = d.getMinutes().toString().padStart(2,"0");
  const s   = d.getSeconds().toString().padStart(2,"0");
  const ampm = h24 < 12 ? "am" : "pm";
  return `${h.toString().padStart(2,"0")}:${m}:${s} ${ampm}`;
}

function buildAnalysePairs(recs: Werktijd[]): WorkPair[] {
  const sorted = [...recs].sort((a, b) =>
    parseChecktime(a.checktime).getTime() - parseChecktime(b.checktime).getTime()
  );
  const pairs: WorkPair[] = [];
  let pendingIn: Werktijd | null = null;

  for (const r of sorted) {
    if (r.checktype === "in") {
      if (pendingIn !== null) {
        pairs.push({
          inRec: pendingIn, outRec: null,
          inTime: parseChecktime(pendingIn.checktime),
          outTime: null, durSec: null, werktijdSec: null,
        });
      }
      pendingIn = r;
    } else {
      if (pendingIn !== null) {
        const inTime  = parseChecktime(pendingIn.checktime);
        const outTime = parseChecktime(r.checktime);
        const durSec  = (outTime.getTime() - inTime.getTime()) / 1000;
        const inSec   = secOfDay(inTime);
        const outSec  = secOfDay(outTime);
        const brkOv   = Math.max(0, Math.min(outSec, ANA_BREAK_E) - Math.max(inSec, ANA_BREAK_S));
        const werktijdSec = Math.max(0, durSec - brkOv);
        pairs.push({ inRec: pendingIn, outRec: r, inTime, outTime, durSec, werktijdSec });
        pendingIn = null;
      }
    }
  }
  if (pendingIn !== null) {
    pairs.push({
      inRec: pendingIn, outRec: null,
      inTime: parseChecktime(pendingIn.checktime),
      outTime: null, durSec: null, werktijdSec: null,
    });
  }
  return pairs;
}

function detectPauze(pairs: WorkPair[]): PauzePair | null {
  for (let i = 0; i < pairs.length - 1; i++) {
    const s1 = pairs[i]; const s2 = pairs[i + 1];
    if (!s1.outRec || !s1.outTime || !s2.inTime) continue;
    const outSec = secOfDay(s1.outTime);
    const inSec  = secOfDay(s2.inTime);
    const gapSec = (s2.inTime.getTime() - s1.outTime.getTime()) / 1000;
    if (outSec >= ANA_PAUZE_OUT_MIN && outSec <= ANA_PAUZE_OUT_MAX &&
        inSec  >= ANA_PAUZE_IN_MIN  && inSec  <= ANA_PAUZE_IN_MAX  &&
        gapSec >= 30*60 && gapSec <= 180*60) {
      return {
        outRec: s1.outRec, inRec: s2.inRec,
        outTime: s1.outTime, inTime: s2.inTime, durSec: gapSec,
      };
    }
  }
  return null;
}

function computeDagAnalyse(datum: string, recs: Werktijd[], isAbsent: boolean): DagAnalyse {
  const d        = new Date(datum + "T00:00:00");
  const isFriday = d.getDay() === 5;
  const targetSec = isFriday ? ANA_TARGET_FR : ANA_TARGET_WD;
  const b4Start   = isFriday ? ANA_BLK4_FR  : ANA_BLK4_WD;

  const pairs          = buildAnalysePairs(recs);
  const completePairs  = pairs.filter(p => p.outRec !== null);
  const incompletePairs= pairs.filter(p => p.outRec === null);
  const pauze          = detectPauze(pairs);

  const totaalWerktijdSec = completePairs.reduce((s, p) => s + (p.werktijdSec ?? 0), 0);
  const verschilSec       = totaalWerktijdSec - targetSec;

  const sorted  = [...recs].sort((a, b) =>
    parseChecktime(a.checktime).getTime() - parseChecktime(b.checktime).getTime()
  );
  const inRecs  = sorted.filter(r => r.checktype === "in");
  const outRecs = sorted.filter(r => r.checktype === "out");

  const blok1Ok = inRecs.some(r => { const s = secOfDay(parseChecktime(r.checktime)); return s >= ANA_BLK1_S && s <= ANA_BLK1_E; });
  const blok2Ok = outRecs.some(r => { const s = secOfDay(parseChecktime(r.checktime)); return s >= ANA_BLK2_S && s <= ANA_BLK2_E + 30*60; });
  const blok3Ok = inRecs.some(r => { const s = secOfDay(parseChecktime(r.checktime)); return s >= ANA_BLK3_S && s <= ANA_BLK3_E + 30*60; });
  const blok4Ok = outRecs.some(r => { const s = secOfDay(parseChecktime(r.checktime)); return s >= b4Start - 15*60 && s <= ANA_BLK4_E; });

  const teLaat:     Array<{ rec: Werktijd; tijd: string }> = [];
  const teVroegIn:  Array<{ rec: Werktijd; tijd: string }> = [];
  const teVroegUit: Array<{ rec: Werktijd; tijd: string }> = [];

  for (const r of sorted) {
    const dt   = parseChecktime(r.checktime);
    const sec  = secOfDay(dt);
    const tijd = formatTime12(dt);
    if (r.checktype === "in") {
      if (sec < ANA_BLK1_S) {
        teVroegIn.push({ rec: r, tijd });
      } else if (sec > ANA_BLK1_E && sec < 13 * _H) {
        teLaat.push({ rec: r, tijd });
      } else if (sec > ANA_BLK3_E && sec >= 12 * _H) {
        teLaat.push({ rec: r, tijd });
      }
    } else {
      // Uitklok te vroeg: voor blok4-venster, alleen als er geen goedgekeurde absence is
      if (!isAbsent && sec >= ANA_BREAK_E && sec < b4Start) {
        teVroegUit.push({ rec: r, tijd });
      }
    }
  }

  return {
    datum, dagStr: format(d, "dd-MM-yyyy"),
    weekdagKort: format(d, "EEE"),
    isFriday, pairs, completePairs, incompletePairs, pauze,
    totaalWerktijdSec, targetSec, verschilSec,
    blok1Ok, blok2Ok, blok3Ok, blok4Ok,
    teLaat, teVroegIn, teVroegUit, isAbsent,
  };
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

// ── Analyse sub-component ─────────────────────────────────────────────────────
function AnalyseContent({
  data,
  showOnlyIncomplete,
  setShowOnlyIncomplete,
}: {
  data: DagAnalyse[];
  showOnlyIncomplete: boolean;
  setShowOnlyIncomplete: (v: boolean) => void;
}) {
  const verzuimDagen  = data.filter(d =>
    !d.isAbsent && d.completePairs.length > 0 &&
    (!d.blok1Ok || !d.blok2Ok || !d.blok3Ok || !d.blok4Ok)
  );
  const allTeLaat     = data.flatMap(d => d.teLaat.map(t => ({ ...t, dag: d })));
  const allTeVroegIn  = data.flatMap(d => d.teVroegIn.map(t => ({ ...t, dag: d })));
  const allTeVroegUit = data.flatMap(d => d.teVroegUit.map(t => ({ ...t, dag: d })));
  const allPauzes     = data.filter(d => d.pauze !== null).map(d => ({ pauze: d.pauze!, dag: d }));
  const totalPauzeSec = allPauzes.reduce((s, p) => s + p.pauze.durSec, 0);
  const totalWerktijdSec  = data.reduce((s, d) => s + d.totaalWerktijdSec, 0);
  const totalDagenGewerkt = data.filter(d => d.completePairs.length > 0).length;
  const totalIncomplete   = data.reduce((s, d) => s + d.incompletePairs.length, 0);
  const variabelSaldoSec  = data.reduce((s, d) => s + (d.isAbsent ? 0 : d.verschilSec), 0);

  type WerkRow = { dag: DagAnalyse; pair: WorkPair; isLast: boolean; isIncomplete: boolean };
  const werkRows: WerkRow[] = [];
  for (const dag of data) {
    dag.completePairs.forEach((pair, idx) => {
      werkRows.push({ dag, pair, isLast: idx === dag.completePairs.length - 1, isIncomplete: false });
    });
    dag.incompletePairs.forEach(pair => werkRows.push({ dag, pair, isLast: false, isIncomplete: true }));
  }
  const displayedRows = showOnlyIncomplete ? werkRows.filter(r => r.isIncomplete) : werkRows;

  return (
    <div className="space-y-5">
      {/* Samenvatting KPI's */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950/30">
                <ShieldAlert className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Verzuim te klokken</p>
                <p className="text-2xl font-bold text-red-600" data-testid="kpi-verzuim">{verzuimDagen.length}</p>
                <p className="text-xs text-muted-foreground">dag(en)</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30">
                <ClockAlert className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Te laat ingeklokt</p>
                <p className="text-2xl font-bold text-amber-600" data-testid="kpi-telaat">{allTeLaat.length}</p>
                <p className="text-xs text-muted-foreground">keer</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-950/30">
                <LogOut className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Te vroeg uitgeklokt</p>
                <p className="text-2xl font-bold text-orange-600" data-testid="kpi-tevroeguit">{allTeVroegUit.length}</p>
                <p className="text-xs text-muted-foreground">keer</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${variabelSaldoSec >= 0 ? "bg-green-50 dark:bg-green-950/30" : "bg-orange-50 dark:bg-orange-950/30"}`}>
                {variabelSaldoSec >= 0
                  ? <TrendingUp className="h-5 w-5 text-green-600" />
                  : <TrendingDown className="h-5 w-5 text-orange-600" />}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Variabel saldo</p>
                <p className={`text-lg font-bold font-mono ${variabelSaldoSec >= 0 ? "text-green-600" : "text-orange-600"}`} data-testid="kpi-saldo">
                  {variabelSaldoSec >= 0 ? "+" : "-"}{formatHMS(Math.abs(variabelSaldoSec))}
                </p>
                <p className="text-xs text-muted-foreground">{variabelSaldoSec >= 0 ? "te veel" : "te weinig"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Totaal gewerkt</p>
                <p className="text-lg font-bold font-mono text-blue-600" data-testid="kpi-totaal">{formatHMS(totalWerktijdSec)}</p>
                <p className="text-xs text-muted-foreground">{totalDagenGewerkt} dag(en)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gewerkte werkuren */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Gewerkte werkuren deze periode:
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {totalIncomplete > 0 && (
            <div className="px-4 pb-2 pt-1">
              <button
                className="text-sm font-semibold text-amber-600 hover:underline"
                onClick={() => setShowOnlyIncomplete(!showOnlyIncomplete)}
                data-testid="button-show-incomplete"
              >
                Totaal incomplete werkuren: {totalIncomplete}{" "}
                {showOnlyIncomplete ? "— toon alles" : "Klik hier"}
              </button>
            </div>
          )}
          {displayedRows.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">Geen werkuren gevonden</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead className="pl-4 w-20">Id</TableHead>
                    <TableHead className="w-14">Dag</TableHead>
                    <TableHead className="w-28">Datum</TableHead>
                    <TableHead className="w-28">In</TableHead>
                    <TableHead className="w-28">Out</TableHead>
                    <TableHead className="w-28">Uren gewerkt</TableHead>
                    <TableHead className="w-24">Tot p/d</TableHead>
                    <TableHead className="w-24 text-amber-700 dark:text-amber-400">te veel</TableHead>
                    <TableHead className="w-24 text-red-600 pr-4">minder</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedRows.map((row, i) => (
                    <TableRow
                      key={`${row.pair.inRec.logid}-${i}`}
                      className={row.isIncomplete ? "bg-amber-50/40 dark:bg-amber-950/10" : ""}
                      data-testid={`row-werk-${row.pair.inRec.logid}`}
                    >
                      <TableCell className="pl-4 text-xs font-mono text-muted-foreground">{row.pair.inRec.logid}</TableCell>
                      <TableCell className="text-sm">{row.dag.weekdagKort}</TableCell>
                      <TableCell className="text-sm">{row.dag.dagStr}</TableCell>
                      <TableCell className="text-sm font-mono">{formatTime12(row.pair.inTime)}</TableCell>
                      <TableCell className="text-sm font-mono">
                        {row.pair.outTime
                          ? formatTime12(row.pair.outTime)
                          : <span className="text-amber-500 italic text-xs">niet uitgelokt</span>}
                      </TableCell>
                      <TableCell className="text-sm font-mono">
                        {row.pair.werktijdSec !== null ? formatHMS(row.pair.werktijdSec) : "—"}
                      </TableCell>
                      <TableCell className="text-sm font-mono font-semibold text-amber-700 dark:text-amber-400">
                        {row.isLast ? formatHMS(row.dag.totaalWerktijdSec) : ""}
                      </TableCell>
                      <TableCell className="text-sm font-mono font-semibold text-red-600">
                        {row.isLast && row.dag.verschilSec > 0 ? formatHMS(row.dag.verschilSec) : row.isLast ? "---" : ""}
                      </TableCell>
                      <TableCell className="text-sm font-mono font-semibold text-red-600 pr-4">
                        {row.isLast && row.dag.verschilSec < 0 ? formatHMS(-row.dag.verschilSec) : row.isLast ? "---" : ""}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <div className="px-4 py-3 border-t flex flex-wrap gap-6 text-sm text-muted-foreground">
            <span>Totaal gewerkt: <strong className="text-foreground font-mono">{formatHMS(totalWerktijdSec)}</strong> uren gewerkt</span>
            <span>Totaal dagen gewerkt: <strong className="text-foreground">{totalDagenGewerkt}</strong> dag(en)</span>
          </div>
        </CardContent>
      </Card>

      {/* Te laat ingeklokt */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <ClockAlert className="h-4 w-4" />
            Te laat ingeklokt deze periode:
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {allTeLaat.length === 0 ? (
            <div className="py-6 text-center text-muted-foreground text-sm">Geen te laat geregistreerd ✓</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead className="pl-4 w-20"><u>Id</u></TableHead>
                  <TableHead className="w-16"><u>Dag</u></TableHead>
                  <TableHead className="w-28"><u>Datum</u></TableHead>
                  <TableHead className="pr-4"><u>Tijd</u></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allTeLaat.map((item, i) => (
                  <TableRow key={`tl-${item.rec.logid}-${i}`} data-testid={`row-telaat-${item.rec.logid}`}>
                    <TableCell className="pl-4 text-sm font-mono">{item.rec.logid}</TableCell>
                    <TableCell className="text-sm">{item.dag.weekdagKort}</TableCell>
                    <TableCell className="text-sm">{item.dag.dagStr}</TableCell>
                    <TableCell className="text-sm font-mono font-semibold text-red-600 dark:text-red-400 pr-4">{item.tijd}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Te vroeg uitgeklokt */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2 text-orange-700 dark:text-orange-400">
            <LogOut className="h-4 w-4" />
            Te vroeg uitgeklokt deze periode:
            <span className="ml-auto text-xs font-normal text-muted-foreground">
              Zonder goedgekeurd persoonlijk verzuim
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {allTeVroegUit.length === 0 ? (
            <div className="py-6 text-center text-muted-foreground text-sm">Geen te vroeg uitgeklokt ✓</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead className="pl-4 w-20"><u>Id</u></TableHead>
                  <TableHead className="w-16"><u>Dag</u></TableHead>
                  <TableHead className="w-28"><u>Datum</u></TableHead>
                  <TableHead className="pr-4"><u>Uitkloktijd</u></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allTeVroegUit.map((item, i) => (
                  <TableRow key={`tvu-${item.rec.logid}-${i}`} data-testid={`row-tevroeguit-${item.rec.logid}`}>
                    <TableCell className="pl-4 text-sm font-mono">{item.rec.logid}</TableCell>
                    <TableCell className="text-sm">{item.dag.weekdagKort}</TableCell>
                    <TableCell className="text-sm">{item.dag.dagStr}</TableCell>
                    <TableCell className="text-sm font-mono font-semibold text-orange-600 dark:text-orange-400 pr-4">{item.tijd}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Te vroeg ingeklokt (IN vóór 07:00) — alleen tonen als van toepassing */}
      {allTeVroegIn.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-blue-700 dark:text-blue-400">
              <ClockAlert className="h-4 w-4" />
              Te vroeg ingeklokt (vóór 07:00):
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead className="pl-4 w-20"><u>Id</u></TableHead>
                  <TableHead className="w-16"><u>Dag</u></TableHead>
                  <TableHead className="w-28"><u>Datum</u></TableHead>
                  <TableHead className="pr-4"><u>Inkloktijd</u></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allTeVroegIn.map((item, i) => (
                  <TableRow key={`tvi-${item.rec.logid}-${i}`} data-testid={`row-tevroegin-${item.rec.logid}`}>
                    <TableCell className="pl-4 text-sm font-mono">{item.rec.logid}</TableCell>
                    <TableCell className="text-sm">{item.dag.weekdagKort}</TableCell>
                    <TableCell className="text-sm">{item.dag.dagStr}</TableCell>
                    <TableCell className="text-sm font-mono font-semibold text-blue-600 dark:text-blue-400 pr-4">{item.tijd}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Pauze overzichten */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <CoffeeIcon className="h-5 w-5 text-primary" />
            Pauze overzichten:
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {allPauzes.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">Geen pauzeregistraties gevonden</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead className="pl-4 w-20"><u>Id</u></TableHead>
                  <TableHead className="w-14"><u>Dag</u></TableHead>
                  <TableHead className="w-28"><u>Datum</u></TableHead>
                  <TableHead className="w-28"><u>Out</u></TableHead>
                  <TableHead className="w-28"><u>In</u></TableHead>
                  <TableHead className="pr-4"><u>Totaal pauze</u></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allPauzes.map(({ pauze, dag }, i) => (
                  <TableRow key={`pauze-${pauze.outRec.logid}-${i}`} data-testid={`row-pauze-${pauze.outRec.logid}`}>
                    <TableCell className="pl-4 text-sm font-mono">{pauze.outRec.logid}</TableCell>
                    <TableCell className="text-sm">{dag.weekdagKort}</TableCell>
                    <TableCell className="text-sm">{dag.dagStr}</TableCell>
                    <TableCell className="text-sm font-mono">{formatTime12(pauze.outTime)}</TableCell>
                    <TableCell className="text-sm font-mono">{formatTime12(pauze.inTime)}</TableCell>
                    <TableCell className="text-sm font-mono font-semibold pr-4">{formatHMS(pauze.durSec)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {allPauzes.length > 0 && (
            <div className="px-4 py-3 border-t text-sm text-right text-muted-foreground">
              Totaal pauze:{" "}
              <strong className="text-foreground font-mono">{formatHMS(totalPauzeSec)}</strong> uren pauze
            </div>
          )}
        </CardContent>
      </Card>

      {/* Verzuim bloktijden detail */}
      {verzuimDagen.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-red-700 dark:text-red-400">
              <ShieldAlert className="h-5 w-5" />
              Verzuim te klokken — gemiste bloktijden per dag
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="text-xs">
                  <TableHead className="pl-4 w-14">Dag</TableHead>
                  <TableHead className="w-28">Datum</TableHead>
                  <TableHead className="w-36 text-center">Blok 1<br /><span className="font-normal text-muted-foreground">07:00–08:00</span></TableHead>
                  <TableHead className="w-36 text-center">Blok 2<br /><span className="font-normal text-muted-foreground">11:45–12:00</span></TableHead>
                  <TableHead className="w-36 text-center">Blok 3<br /><span className="font-normal text-muted-foreground">13:30–14:00</span></TableHead>
                  <TableHead className="pr-4 text-center">Blok 4<br /><span className="font-normal text-muted-foreground">16:45/16:30–18:00</span></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {verzuimDagen.map((dag, i) => (
                  <TableRow key={`vz-${dag.datum}-${i}`} className="bg-red-50/30 dark:bg-red-950/10" data-testid={`row-verzuim-${dag.datum}`}>
                    <TableCell className="pl-4 text-sm">{dag.weekdagKort}</TableCell>
                    <TableCell className="text-sm">{dag.dagStr}</TableCell>
                    <TableCell className="text-center">
                      {dag.blok1Ok
                        ? <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" />
                        : <XCircle className="h-4 w-4 text-red-500 mx-auto" />}
                    </TableCell>
                    <TableCell className="text-center">
                      {dag.blok2Ok
                        ? <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" />
                        : <XCircle className="h-4 w-4 text-red-500 mx-auto" />}
                    </TableCell>
                    <TableCell className="text-center">
                      {dag.blok3Ok
                        ? <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" />
                        : <XCircle className="h-4 w-4 text-red-500 mx-auto" />}
                    </TableCell>
                    <TableCell className="text-center pr-4">
                      {dag.blok4Ok
                        ? <CheckCircle2 className="h-4 w-4 text-green-600 mx-auto" />
                        : <XCircle className="h-4 w-4 text-red-500 mx-auto" />}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
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
  const [analyseUserId, setAnalyseUserId]         = useState("");
  const [analyseFrom, setAnalyseFrom]             = useState("");
  const [analyseTo, setAnalyseTo]                 = useState("");
  const [showOnlyIncomplete, setShowOnlyIncomplete] = useState(false);
  const [filterSessionDept, setFilterSessionDept] = useState("all");
  const [showWaarschuwingDialog, setShowWaarschuwingDialog] = useState(false);
  const [waarschuwingTekst, setWaarschuwingTekst] = useState("");

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

  const { data: absences = [] } = useQuery<AbsenceRecord[]>({
    queryKey: ["/api/absences"],
    enabled: isManager,
  });

  const { data: departments = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["/api/departments"],
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

  const sendWaarschuwingMutation = useMutation({
    mutationFn: async ({ toUserId, subject, content }: { toUserId: string; subject: string; content: string }) => {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ toUserId, subject, content }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.message || "Verzenden mislukt");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Waarschuwing verstuurd", description: `Bericht verstuurd aan ${getUserName(analyseUserId)}` });
      setShowWaarschuwingDialog(false);
    },
    onError: (err: any) => toast({ title: "Fout bij verzenden", description: err.message, variant: "destructive" }),
  });

  function composeWaarschuwing(): string {
    if (!analyseData || !analyseUserId) return "";
    const naam = getUserName(analyseUserId);
    const verzuimDagen = analyseData.filter(d =>
      !d.isAbsent && d.completePairs.length > 0 &&
      (!d.blok1Ok || !d.blok2Ok || !d.blok3Ok || !d.blok4Ok)
    );
    const allTeLaat    = analyseData.flatMap(d => d.teLaat.map(t => ({ ...t, dag: d })));
    const allTeVroegUit = analyseData.flatMap(d => d.teVroegUit.map(t => ({ ...t, dag: d })));
    const allIncomplete = analyseData.reduce((s, d) => s + d.incompletePairs.length, 0);
    const variabelSaldoSec = analyseData.reduce((s, d) => s + (d.isAbsent ? 0 : d.verschilSec), 0);

    const periodeStr = analyseFrom && analyseTo
      ? `${analyseFrom.split("-").reverse().join("-")} t/m ${analyseTo.split("-").reverse().join("-")}`
      : analyseFrom ? `vanaf ${analyseFrom.split("-").reverse().join("-")}`
      : analyseTo   ? `t/m ${analyseTo.split("-").reverse().join("-")}`
      : "de geanalyseerde periode";

    const punten: string[] = [];
    if (allIncomplete > 0) {
      punten.push(`• Ontbrekende kloktijden: ${allIncomplete} onvolledige registratie(s). Gelieve uw in- of uitklokregistraties te controleren.`);
    }
    if (verzuimDagen.length > 0) {
      const dagstr = verzuimDagen.map(d => `${d.weekdagKort} ${d.dagStr}`).join(", ");
      punten.push(`• Verzuim te klokken (bloktijden niet nageleefd): ${verzuimDagen.length} dag(en) — ${dagstr}.`);
    }
    if (allTeLaat.length > 0) {
      const items = allTeLaat.map(t => `${t.dag.weekdagKort} ${t.dag.dagStr} (${t.tijd})`).join(", ");
      punten.push(`• Te laat ingeklokt: ${allTeLaat.length} keer — ${items}.`);
    }
    if (allTeVroegUit.length > 0) {
      const items = allTeVroegUit.map(t => `${t.dag.weekdagKort} ${t.dag.dagStr} (${t.tijd})`).join(", ");
      punten.push(`• Te vroeg uitgeklokt: ${allTeVroegUit.length} keer — ${items}.`);
    }
    if (variabelSaldoSec < 0) {
      const mins = Math.abs(Math.round(variabelSaldoSec / 60));
      const u = Math.floor(mins / 60);
      const m = mins % 60;
      const saldoStr = u > 0 ? `${u}u ${m.toString().padStart(2, "0")}min` : `${m} min`;
      punten.push(`• Negatief uurssaldo: ${saldoStr} te weinig gewerkt in de periode.`);
    }

    if (punten.length === 0) {
      return `Beste ${naam},\n\nWij hebben uw prikklokregistraties over ${periodeStr} doorgenomen. Er zijn geen bijzonderheden geconstateerd.\n\nMet vriendelijke groet,\nHRM`;
    }
    return `Beste ${naam},\n\nNaar aanleiding van uw prikklokregistraties over ${periodeStr} willen wij u informeren over de volgende aandachtspunten:\n\n${punten.join("\n\n")}\n\nWij verzoeken u dit te bespreken met uw leidinggevende.\n\nMet vriendelijke groet,\nHRM`;
  }

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

  const sessieFilteredUsers = useMemo(() => {
    if (filterSessionDept === "all") return activeUsers;
    return activeUsers.filter((u: any) => u.department === filterSessionDept);
  }, [activeUsers, filterSessionDept]);

  const filteredSessies = useMemo(() => {
    return sessies.filter(s => {
      if (filterUserid !== "all" && s.userid !== filterUserid) return false;
      if (filterDatum && !s.datum.includes(filterDatum)) return false;
      if (filterSessionDept !== "all") {
        const u = activeUsers.find((u: any) => u.kadasterId === s.userid);
        if (!u || (u as any).department !== filterSessionDept) return false;
      }
      return true;
    });
  }, [sessies, filterUserid, filterDatum, filterSessionDept, activeUsers]);

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

  // ── Analyse data berekening ──────────────────────────────────────────────────
  const analyseData = useMemo((): DagAnalyse[] | null => {
    if (!analyseUserId) return null;
    const userObj = activeUsers.find((u: any) => u.kadasterId === analyseUserId);
    const userId  = userObj?.id as number | undefined;

    const userRecs = records.filter(r => {
      if (r.userid !== analyseUserId) return false;
      const dk = dateKey(r.checktime);
      if (analyseFrom && dk < analyseFrom) return false;
      if (analyseTo   && dk > analyseTo)   return false;
      return true;
    });

    const byDay: Record<string, Werktijd[]> = {};
    for (const r of userRecs) {
      const k = dateKey(r.checktime);
      if (!byDay[k]) byDay[k] = [];
      byDay[k].push(r);
    }

    const isDateAbsent = (datum: string) => {
      if (!userId) return false;
      return absences.some((a: AbsenceRecord) =>
        a.userId === userId &&
        a.status === "approved" &&
        datum >= a.startDate.slice(0, 10) &&
        datum <= a.endDate.slice(0, 10)
      );
    };

    return Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([datum, recs]) => computeDagAnalyse(datum, recs, isDateAbsent(datum)));
  }, [records, analyseUserId, analyseFrom, analyseTo, absences, activeUsers]);

  if (!isManager) {
    return (
      <div className="overflow-auto h-full">
        <PageHero title="Werktijden" subtitle="Prikklok data import & verwerking" imageSrc="/uploads/App_pics/werktijden.png" />
        <div className="p-6">
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
    <div className="overflow-auto h-full">
      <PageHero title="Werktijden" subtitle="Prikklok data import & verwerking" imageSrc="/uploads/App_pics/werktijden.png" />
      <div className="p-6 space-y-6">

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
          <Card
            className={`cursor-pointer transition-colors ${analyseUserId && analyseData && analyseData.length > 0 ? "hover:bg-amber-50 dark:hover:bg-amber-950/20 border-amber-200 dark:border-amber-800" : "opacity-60 cursor-not-allowed"}`}
            onClick={() => {
              if (!analyseUserId || !analyseData || analyseData.length === 0) return;
              setWaarschuwingTekst(composeWaarschuwing());
              setShowWaarschuwingDialog(true);
            }}
            data-testid="card-verstuur-waarschuwing"
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30">
                  <Send className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Verstuur waarschuwing</p>
                  <p className="text-xs font-semibold mt-0.5 text-amber-700 dark:text-amber-400">
                    {analyseUserId && analyseData && analyseData.length > 0
                      ? `aan ${getUserName(analyseUserId)}`
                      : "Selecteer medewerker"}
                  </p>
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
                    {lastImport ? format(new Date(lastImport.importedAt), "dd-MM hh:mm aa") : "—"}
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
            <TabsTrigger value="analyse" data-testid="tab-analyse">
              <BarChart3 className="h-4 w-4 mr-1.5" />
              Analyse
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
              <Select
                value={filterSessionDept}
                onValueChange={(v) => { setFilterSessionDept(v); setFilterUserid("all"); }}
              >
                <SelectTrigger className="w-48" data-testid="select-filter-dept-sessies">
                  <Building2 className="h-4 w-4 mr-1.5 text-muted-foreground" />
                  <SelectValue placeholder="Kies afdeling…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle afdelingen</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterUserid} onValueChange={setFilterUserid}>
                <SelectTrigger className="w-52" data-testid="select-filter-sessies">
                  <Users className="h-4 w-4 mr-1.5 text-muted-foreground" />
                  <SelectValue placeholder="Medewerker…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle medewerkers</SelectItem>
                  {sessieFilteredUsers.map((u: any) => (
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

          {/* ── Analyse tab ──────────────────────────────────────────────────── */}
          <TabsContent value="analyse" className="space-y-5 mt-4">
            {/* Filter balk */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-3 items-end">
                  <div className="flex-1 min-w-[200px]">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Medewerker</label>
                    <Select
                      value={analyseUserId}
                      onValueChange={(v) => { setAnalyseUserId(v); setShowOnlyIncomplete(false); }}
                    >
                      <SelectTrigger data-testid="select-analyse-userid">
                        <Users className="h-4 w-4 mr-1.5 text-muted-foreground" />
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
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Van</label>
                    <Input
                      type="date"
                      value={analyseFrom}
                      onChange={e => setAnalyseFrom(e.target.value)}
                      className="w-40"
                      data-testid="input-analyse-from"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Tot en met</label>
                    <Input
                      type="date"
                      value={analyseTo}
                      onChange={e => setAnalyseTo(e.target.value)}
                      className="w-40"
                      data-testid="input-analyse-to"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setAnalyseFrom(""); setAnalyseTo(""); setShowOnlyIncomplete(false); }}
                    data-testid="button-analyse-reset"
                  >
                    <RefreshCw className="h-4 w-4 mr-1.5" />
                    Reset
                  </Button>
                </div>
                {analyseUserId && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Medewerker: <strong>{getUserName(analyseUserId)}</strong>
                    {analyseFrom && ` · Van: ${analyseFrom.split("-").reverse().join("-")}`}
                    {analyseTo && ` · T/m: ${analyseTo.split("-").reverse().join("-")}`}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Geen medewerker geselecteerd */}
            {!analyseUserId && (
              <Card>
                <CardContent className="py-16 text-center text-muted-foreground">
                  <BarChart3 className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Selecteer een medewerker om de analyse te bekijken</p>
                  <p className="text-sm mt-1">Gebruik het filter bovenaan om een medewerker en periode te kiezen</p>
                </CardContent>
              </Card>
            )}

            {/* Geen data gevonden */}
            {analyseUserId && analyseData !== null && analyseData.length === 0 && (
              <Card>
                <CardContent className="py-16 text-center text-muted-foreground">
                  <Database className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">Geen prikklokdata gevonden</p>
                  <p className="text-sm mt-1">
                    Geen registraties voor <strong>{getUserName(analyseUserId)}</strong>
                    {(analyseFrom || analyseTo) && " in de geselecteerde periode"}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Analyse resultaten */}
            {analyseUserId && analyseData && analyseData.length > 0 && (
              <AnalyseContent
                data={analyseData}
                showOnlyIncomplete={showOnlyIncomplete}
                setShowOnlyIncomplete={setShowOnlyIncomplete}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Waarschuwing dialog ─────────────────────────────────────────────── */}
      <Dialog open={showWaarschuwingDialog} onOpenChange={setShowWaarschuwingDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <Send className="h-5 w-5" />
              Waarschuwing versturen
              {analyseUserId && <span className="font-normal text-sm text-muted-foreground ml-1">— {getUserName(analyseUserId)}</span>}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Controleer en pas het bericht aan indien gewenst, dan klik op Verstuur.
            </p>
            <Textarea
              className="min-h-[280px] font-mono text-sm"
              value={waarschuwingTekst}
              onChange={(e) => setWaarschuwingTekst(e.target.value)}
              data-testid="textarea-waarschuwing"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowWaarschuwingDialog(false)}
              data-testid="button-waarschuwing-annuleer"
            >
              Annuleer
            </Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white"
              disabled={sendWaarschuwingMutation.isPending || !waarschuwingTekst.trim()}
              onClick={() => {
                const userObj = activeUsers.find((u: any) => u.kadasterId === analyseUserId);
                if (!userObj) return;
                const periodeStr = analyseFrom && analyseTo
                  ? `${analyseFrom.split("-").reverse().join("-")} t/m ${analyseTo.split("-").reverse().join("-")}`
                  : "werktijden";
                sendWaarschuwingMutation.mutate({
                  toUserId: (userObj as any).id,
                  subject: `Waarschuwing werktijden — ${periodeStr}`,
                  content: waarschuwingTekst,
                });
              }}
              data-testid="button-waarschuwing-verstuur"
            >
              <Send className="h-4 w-4 mr-1.5" />
              {sendWaarschuwingMutation.isPending ? "Versturen…" : "Verstuur"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
