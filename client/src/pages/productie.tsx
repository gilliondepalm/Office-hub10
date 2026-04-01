import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line,
} from "recharts";
import { TrendingUp, TrendingDown, Minus, ClipboardList, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { PageHero } from "@/components/page-hero";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

const MAANDEN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dec"];

const ORI_DATA: Record<string, { maand: string; ingediend: number; verwerkt: number; afgewezen: number; doorlooptijd: number }[]> = {
  "2024": [
    { maand: "Jan", ingediend: 312, verwerkt: 298, afgewezen: 14, doorlooptijd: 3.2 },
    { maand: "Feb", ingediend: 287, verwerkt: 275, afgewezen: 12, doorlooptijd: 3.0 },
    { maand: "Mar", ingediend: 341, verwerkt: 330, afgewezen: 11, doorlooptijd: 2.8 },
    { maand: "Apr", ingediend: 298, verwerkt: 290, afgewezen: 8,  doorlooptijd: 2.9 },
    { maand: "Mei", ingediend: 375, verwerkt: 360, afgewezen: 15, doorlooptijd: 3.1 },
    { maand: "Jun", ingediend: 362, verwerkt: 350, afgewezen: 12, doorlooptijd: 3.0 },
    { maand: "Jul", ingediend: 280, verwerkt: 268, afgewezen: 12, doorlooptijd: 3.4 },
    { maand: "Aug", ingediend: 255, verwerkt: 245, afgewezen: 10, doorlooptijd: 3.5 },
    { maand: "Sep", ingediend: 320, verwerkt: 310, afgewezen: 10, doorlooptijd: 3.1 },
    { maand: "Okt", ingediend: 348, verwerkt: 338, afgewezen: 10, doorlooptijd: 2.9 },
    { maand: "Nov", ingediend: 330, verwerkt: 318, afgewezen: 12, doorlooptijd: 3.0 },
    { maand: "Dec", ingediend: 290, verwerkt: 278, afgewezen: 12, doorlooptijd: 3.2 },
  ],
  "2025": [
    { maand: "Jan", ingediend: 325, verwerkt: 315, afgewezen: 10, doorlooptijd: 2.9 },
    { maand: "Feb", ingediend: 295, verwerkt: 285, afgewezen: 10, doorlooptijd: 2.8 },
    { maand: "Mar", ingediend: 358, verwerkt: 348, afgewezen: 10, doorlooptijd: 2.7 },
    { maand: "Apr", ingediend: 310, verwerkt: 302, afgewezen: 8,  doorlooptijd: 2.7 },
    { maand: "Mei", ingediend: 388, verwerkt: 375, afgewezen: 13, doorlooptijd: 2.9 },
    { maand: "Jun", ingediend: 372, verwerkt: 362, afgewezen: 10, doorlooptijd: 2.8 },
    { maand: "Jul", ingediend: 290, verwerkt: 280, afgewezen: 10, doorlooptijd: 3.2 },
    { maand: "Aug", ingediend: 268, verwerkt: 258, afgewezen: 10, doorlooptijd: 3.3 },
    { maand: "Sep", ingediend: 335, verwerkt: 325, afgewezen: 10, doorlooptijd: 2.9 },
    { maand: "Okt", ingediend: 360, verwerkt: 350, afgewezen: 10, doorlooptijd: 2.7 },
    { maand: "Nov", ingediend: 342, verwerkt: 330, afgewezen: 12, doorlooptijd: 2.8 },
    { maand: "Dec", ingediend: 305, verwerkt: 293, afgewezen: 12, doorlooptijd: 3.0 },
  ],
  "2026": [
    { maand: "Jan", ingediend: 338, verwerkt: 328, afgewezen: 10, doorlooptijd: 2.8 },
    { maand: "Feb", ingediend: 302, verwerkt: 292, afgewezen: 10, doorlooptijd: 2.7 },
    { maand: "Mar", ingediend: 365, verwerkt: 355, afgewezen: 10, doorlooptijd: 2.6 },
    { maand: "Apr", ingediend: 0,   verwerkt: 0,   afgewezen: 0,  doorlooptijd: 0 },
    { maand: "Mei", ingediend: 0,   verwerkt: 0,   afgewezen: 0,  doorlooptijd: 0 },
    { maand: "Jun", ingediend: 0,   verwerkt: 0,   afgewezen: 0,  doorlooptijd: 0 },
    { maand: "Jul", ingediend: 0,   verwerkt: 0,   afgewezen: 0,  doorlooptijd: 0 },
    { maand: "Aug", ingediend: 0,   verwerkt: 0,   afgewezen: 0,  doorlooptijd: 0 },
    { maand: "Sep", ingediend: 0,   verwerkt: 0,   afgewezen: 0,  doorlooptijd: 0 },
    { maand: "Okt", ingediend: 0,   verwerkt: 0,   afgewezen: 0,  doorlooptijd: 0 },
    { maand: "Nov", ingediend: 0,   verwerkt: 0,   afgewezen: 0,  doorlooptijd: 0 },
    { maand: "Dec", ingediend: 0,   verwerkt: 0,   afgewezen: 0,  doorlooptijd: 0 },
  ],
};

const KM_DATA: Record<string, { maand: string; ingediend: number; verwerkt: number; afgewezen: number; doorlooptijd: number }[]> = {
  "2024": [
    { maand: "Jan", ingediend: 145, verwerkt: 138, afgewezen: 7,  doorlooptijd: 8.5 },
    { maand: "Feb", ingediend: 132, verwerkt: 125, afgewezen: 7,  doorlooptijd: 8.2 },
    { maand: "Mar", ingediend: 168, verwerkt: 160, afgewezen: 8,  doorlooptijd: 7.9 },
    { maand: "Apr", ingediend: 155, verwerkt: 148, afgewezen: 7,  doorlooptijd: 8.0 },
    { maand: "Mei", ingediend: 175, verwerkt: 166, afgewezen: 9,  doorlooptijd: 8.3 },
    { maand: "Jun", ingediend: 182, verwerkt: 173, afgewezen: 9,  doorlooptijd: 8.1 },
    { maand: "Jul", ingediend: 120, verwerkt: 114, afgewezen: 6,  doorlooptijd: 9.0 },
    { maand: "Aug", ingediend: 110, verwerkt: 104, afgewezen: 6,  doorlooptijd: 9.2 },
    { maand: "Sep", ingediend: 152, verwerkt: 145, afgewezen: 7,  doorlooptijd: 8.4 },
    { maand: "Okt", ingediend: 165, verwerkt: 157, afgewezen: 8,  doorlooptijd: 8.0 },
    { maand: "Nov", ingediend: 158, verwerkt: 150, afgewezen: 8,  doorlooptijd: 8.1 },
    { maand: "Dec", ingediend: 130, verwerkt: 122, afgewezen: 8,  doorlooptijd: 8.6 },
  ],
  "2025": [
    { maand: "Jan", ingediend: 152, verwerkt: 146, afgewezen: 6,  doorlooptijd: 8.1 },
    { maand: "Feb", ingediend: 138, verwerkt: 132, afgewezen: 6,  doorlooptijd: 7.9 },
    { maand: "Mar", ingediend: 175, verwerkt: 168, afgewezen: 7,  doorlooptijd: 7.6 },
    { maand: "Apr", ingediend: 162, verwerkt: 155, afgewezen: 7,  doorlooptijd: 7.7 },
    { maand: "Mei", ingediend: 182, verwerkt: 174, afgewezen: 8,  doorlooptijd: 7.9 },
    { maand: "Jun", ingediend: 190, verwerkt: 182, afgewezen: 8,  doorlooptijd: 7.8 },
    { maand: "Jul", ingediend: 128, verwerkt: 122, afgewezen: 6,  doorlooptijd: 8.6 },
    { maand: "Aug", ingediend: 118, verwerkt: 112, afgewezen: 6,  doorlooptijd: 8.8 },
    { maand: "Sep", ingediend: 160, verwerkt: 153, afgewezen: 7,  doorlooptijd: 8.0 },
    { maand: "Okt", ingediend: 172, verwerkt: 164, afgewezen: 8,  doorlooptijd: 7.7 },
    { maand: "Nov", ingediend: 165, verwerkt: 157, afgewezen: 8,  doorlooptijd: 7.8 },
    { maand: "Dec", ingediend: 136, verwerkt: 129, afgewezen: 7,  doorlooptijd: 8.2 },
  ],
  "2026": [
    { maand: "Jan", ingediend: 158, verwerkt: 152, afgewezen: 6,  doorlooptijd: 7.8 },
    { maand: "Feb", ingediend: 143, verwerkt: 137, afgewezen: 6,  doorlooptijd: 7.6 },
    { maand: "Mar", ingediend: 182, verwerkt: 175, afgewezen: 7,  doorlooptijd: 7.4 },
    { maand: "Apr", ingediend: 0,   verwerkt: 0,   afgewezen: 0,  doorlooptijd: 0 },
    { maand: "Mei", ingediend: 0,   verwerkt: 0,   afgewezen: 0,  doorlooptijd: 0 },
    { maand: "Jun", ingediend: 0,   verwerkt: 0,   afgewezen: 0,  doorlooptijd: 0 },
    { maand: "Jul", ingediend: 0,   verwerkt: 0,   afgewezen: 0,  doorlooptijd: 0 },
    { maand: "Aug", ingediend: 0,   verwerkt: 0,   afgewezen: 0,  doorlooptijd: 0 },
    { maand: "Sep", ingediend: 0,   verwerkt: 0,   afgewezen: 0,  doorlooptijd: 0 },
    { maand: "Okt", ingediend: 0,   verwerkt: 0,   afgewezen: 0,  doorlooptijd: 0 },
    { maand: "Nov", ingediend: 0,   verwerkt: 0,   afgewezen: 0,  doorlooptijd: 0 },
    { maand: "Dec", ingediend: 0,   verwerkt: 0,   afgewezen: 0,  doorlooptijd: 0 },
  ],
};

function sumField(data: { ingediend: number; verwerkt: number; afgewezen: number; doorlooptijd: number }[], field: "ingediend" | "verwerkt" | "afgewezen") {
  return data.filter(d => d[field] > 0).reduce((s, d) => s + d[field], 0);
}

function avgField(data: { doorlooptijd: number }[]) {
  const actief = data.filter(d => d.doorlooptijd > 0);
  if (!actief.length) return 0;
  return actief.reduce((s, d) => s + d.doorlooptijd, 0) / actief.length;
}

function Trend({ current, previous }: { current: number; previous: number }) {
  if (!previous || !current) return <Minus className="h-4 w-4 text-muted-foreground" />;
  const pct = ((current - previous) / previous) * 100;
  if (pct > 0) return <span className="flex items-center gap-1 text-green-600 dark:text-green-400 text-xs font-medium"><TrendingUp className="h-3 w-3" />+{pct.toFixed(1)}%</span>;
  if (pct < 0) return <span className="flex items-center gap-1 text-red-500 dark:text-red-400 text-xs font-medium"><TrendingDown className="h-3 w-3" />{pct.toFixed(1)}%</span>;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

function DepartmentTab({ data, prevData, label }: {
  data: { maand: string; ingediend: number; verwerkt: number; afgewezen: number; doorlooptijd: number }[];
  prevData: { maand: string; ingediend: number; verwerkt: number; afgewezen: number; doorlooptijd: number }[];
  label: string;
}) {
  const activeData = data.filter(d => d.ingediend > 0);
  const totIngediend = sumField(data, "ingediend");
  const totVerwerkt = sumField(data, "verwerkt");
  const totAfgewezen = sumField(data, "afgewezen");
  const gemDoorloop = avgField(data);
  const prevIngediend = sumField(prevData, "ingediend");
  const prevVerwerkt = sumField(prevData, "verwerkt");
  const prevDoorloop = avgField(prevData);
  const verwerkingsgraad = totIngediend > 0 ? Math.round((totVerwerkt / totIngediend) * 100) : 0;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card data-testid={`card-ingediend-${label}`}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-1">Totaal ingediend</p>
                <p className="text-2xl font-bold">{totIngediend.toLocaleString("nl")}</p>
              </div>
              <ClipboardList className="h-5 w-5 text-muted-foreground mt-0.5" />
            </div>
            <div className="mt-2"><Trend current={totIngediend} previous={prevIngediend} /></div>
          </CardContent>
        </Card>
        <Card data-testid={`card-verwerkt-${label}`}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-1">Verwerkt</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{totVerwerkt.toLocaleString("nl")}</p>
              </div>
              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
            </div>
            <div className="mt-2"><Trend current={totVerwerkt} previous={prevVerwerkt} /></div>
          </CardContent>
        </Card>
        <Card data-testid={`card-afgewezen-${label}`}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-1">Afgewezen</p>
                <p className="text-2xl font-bold text-red-500 dark:text-red-400">{totAfgewezen.toLocaleString("nl")}</p>
              </div>
              <AlertCircle className="h-5 w-5 text-red-400 mt-0.5" />
            </div>
            <div className="mt-2">
              <Badge variant={verwerkingsgraad >= 95 ? "default" : verwerkingsgraad >= 88 ? "outline" : "destructive"} className="text-xs">
                {verwerkingsgraad}% verwerkt
              </Badge>
            </div>
          </CardContent>
        </Card>
        <Card data-testid={`card-doorlooptijd-${label}`}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-1">Gem. doorlooptijd</p>
                <p className="text-2xl font-bold">{gemDoorloop > 0 ? gemDoorloop.toFixed(1) : "—"} <span className="text-base font-normal text-muted-foreground">dgn</span></p>
              </div>
              <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
            </div>
            <div className="mt-2"><Trend current={-gemDoorloop} previous={-prevDoorloop} /></div>
          </CardContent>
        </Card>
      </div>

      {activeData.length > 0 ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Ingediend vs. Verwerkt per maand</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={activeData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="maand" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                      formatter={(val: number, name: string) => [val.toLocaleString("nl"), name]}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="ingediend" name="Ingediend" fill="#6366f1" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="verwerkt" name="Verwerkt" fill="#22c55e" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="afgewezen" name="Afgewezen" fill="#ef4444" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Doorlooptijd (werkdagen)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={activeData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="maand" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} domain={["auto", "auto"]} />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                      formatter={(val: number) => [`${val.toFixed(1)} dgn`, "Doorlooptijd"]}
                    />
                    <Line type="monotone" dataKey="doorlooptijd" name="Doorlooptijd" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Maandoverzicht</CardTitle>
              <CardDescription className="text-xs">Gedetailleerde productiecijfers per maand</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Maand</TableHead>
                    <TableHead className="text-right">Ingediend</TableHead>
                    <TableHead className="text-right">Verwerkt</TableHead>
                    <TableHead className="text-right">Afgewezen</TableHead>
                    <TableHead className="text-right">% Verwerkt</TableHead>
                    <TableHead className="text-right">Doorlooptijd</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeData.map((row) => {
                    const pct = row.ingediend > 0 ? Math.round((row.verwerkt / row.ingediend) * 100) : 0;
                    return (
                      <TableRow key={row.maand} data-testid={`row-productie-${label}-${row.maand}`}>
                        <TableCell className="font-medium">{row.maand}</TableCell>
                        <TableCell className="text-right">{row.ingediend.toLocaleString("nl")}</TableCell>
                        <TableCell className="text-right text-green-600 dark:text-green-400 font-medium">{row.verwerkt.toLocaleString("nl")}</TableCell>
                        <TableCell className="text-right text-red-500 dark:text-red-400">{row.afgewezen.toLocaleString("nl")}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={pct >= 95 ? "default" : pct >= 88 ? "outline" : "destructive"} className="text-xs">
                            {pct}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">{row.doorlooptijd.toFixed(1)} dgn</TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow className="bg-muted/40 font-semibold">
                    <TableCell>Totaal / Gem.</TableCell>
                    <TableCell className="text-right">{totIngediend.toLocaleString("nl")}</TableCell>
                    <TableCell className="text-right text-green-600 dark:text-green-400">{totVerwerkt.toLocaleString("nl")}</TableCell>
                    <TableCell className="text-right text-red-500 dark:text-red-400">{totAfgewezen.toLocaleString("nl")}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={verwerkingsgraad >= 95 ? "default" : verwerkingsgraad >= 88 ? "outline" : "destructive"} className="text-xs">
                        {verwerkingsgraad}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">{gemDoorloop.toFixed(1)} dgn</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center gap-3">
            <ClipboardList className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-muted-foreground font-medium">Geen productiedata beschikbaar voor dit jaar.</p>
            <p className="text-xs text-muted-foreground">Selecteer een ander jaar of voeg productiecijfers toe.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function ProductiePage() {
  const currentYear = new Date().getFullYear().toString();
  const [jaar, setJaar] = useState(currentYear);
  const prevJaar = (parseInt(jaar) - 1).toString();

  const { data: productieFoto } = useQuery<{ value: string | null }>({
    queryKey: ["/api/site-settings", "productie_photo"],
    queryFn: async () => {
      const res = await fetch("/api/site-settings/productie_photo", { credentials: "include" });
      if (!res.ok) return { value: null };
      return res.json();
    },
  });

  const jaarOpties = ["2024", "2025", "2026"];

  return (
    <div className="overflow-auto h-full">
      <PageHero
        title="Productie"
        subtitle="Productiecijfers en grafieken per afdeling"
        imageSrc={productieFoto?.value || "/uploads/App_pics/rapporten.png"}
        imageAlt="productie"
      />
      <div className="p-6 space-y-5">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-muted-foreground">Jaar:</span>
          <Select value={jaar} onValueChange={setJaar}>
            <SelectTrigger className="w-32" data-testid="select-jaar">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {jaarOpties.map(j => (
                <SelectItem key={j} value={j} data-testid={`option-jaar-${j}`}>{j}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="ori">
          <TabsList className="mb-5">
            <TabsTrigger value="ori" data-testid="tab-ori">
              Openbare Registers en Informatie
            </TabsTrigger>
            <TabsTrigger value="km" data-testid="tab-km">
              Kadastrale Metingen
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ori">
            <DepartmentTab
              data={ORI_DATA[jaar] || []}
              prevData={ORI_DATA[prevJaar] || []}
              label="ORI"
            />
          </TabsContent>

          <TabsContent value="km">
            <DepartmentTab
              data={KM_DATA[jaar] || []}
              prevData={KM_DATA[prevJaar] || []}
              label="KM"
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
