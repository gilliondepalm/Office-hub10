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
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import { Plus, Clock, CheckCircle, XCircle, AlertCircle, Palmtree, CalendarDays, Pencil } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import type { Absence } from "@shared/schema";
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
  totalDays: number;
  usedDays: number;
  remainingDays: number;
};

export default function VerzuimPage() {
  const [open, setOpen] = useState(false);
  const [vacDaysOpen, setVacDaysOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<{ id: string; name: string; days: number } | null>(null);
  const [newDays, setNewDays] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: absences, isLoading } = useQuery<(Absence & { userName?: string })[]>({
    queryKey: ["/api/absences"],
  });

  const { data: vacationBalances, isLoading: loadingBalances } = useQuery<VacationBalance[]>({
    queryKey: ["/api/vacation-balance"],
  });

  const form = useForm<z.infer<typeof absenceFormSchema>>({
    resolver: zodResolver(absenceFormSchema),
    defaultValues: { type: "sick", startDate: "", endDate: "", reason: "", bvvdReason: "", halfDay: "" },
  });

  const watchType = form.watch("type");

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
      await apiRequest("PATCH", `/api/absences/${id}`, { status, approvedBy: user?.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/absences"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vacation-balance"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Status bijgewerkt" });
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

  const isAdmin = user?.role === "admin";
  const isAdminOrManager = user?.role === "admin" || user?.role === "manager";

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
    <div className="p-6 space-y-6 overflow-auto h-full">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-verzuim-title">Verzuim</h1>
          <p className="text-muted-foreground text-sm">Beheer verlof- en ziekmeldingen</p>
        </div>
        <div className="flex gap-2 flex-wrap">
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
                        <FormControl><Input type="date" {...field} data-testid="input-absence-startdate" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="endDate" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Einddatum</FormLabel>
                        <FormControl><Input type="date" {...field} data-testid="input-absence-enddate" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
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

      <Tabs defaultValue="meldingen">
        <TabsList>
          <TabsTrigger value="meldingen" data-testid="tab-meldingen">Meldingen</TabsTrigger>
          <TabsTrigger value="vakantiesaldo" data-testid="tab-vakantiesaldo">Vakantiesaldo</TabsTrigger>
        </TabsList>

        <TabsContent value="meldingen" className="space-y-4 mt-4">
          {myBalance && (
            <Card>
              <CardContent className="flex items-center gap-6 p-4 flex-wrap">
                <Palmtree className="h-5 w-5 text-muted-foreground" />
                <div className="text-sm">
                  <span className="text-muted-foreground">Mijn vakantiesaldo:</span>{" "}
                  <span className="font-semibold" data-testid="text-my-remaining">{myBalance.remainingDays}</span>
                  <span className="text-muted-foreground"> van {myBalance.totalDays} dagen resterend</span>
                  <span className="text-muted-foreground"> ({myBalance.usedDays} opgenomen)</span>
                </div>
              </CardContent>
            </Card>
          )}

          {(!absences || absences.length === 0) ? (
            <Card>
              <CardContent className="flex flex-col items-center py-12">
                <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Geen verzuimmeldingen</p>
              </CardContent>
            </Card>
          ) : (
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
                      {[...absences].sort((a, b) => ((a as any).userName || "").localeCompare((b as any).userName || "", "nl")).map((absence) => {
                        const sc = statusConfig[absence.status] || statusConfig.pending;
                        const StatusIcon = sc.icon;
                        const displayReason = absence.type === "bvvd" && absence.bvvdReason
                          ? absence.bvvdReason + (absence.reason ? ` - ${absence.reason}` : "")
                          : absence.reason || "-";
                        return (
                          <TableRow key={absence.id} data-testid={`row-absence-${absence.id}`}>
                            <TableCell className="font-medium text-sm">
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
                                {absence.status === "pending" && (
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
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="vakantiesaldo" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center gap-2 pb-3">
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
                        <TableHead className="text-right">Opgenomen</TableHead>
                        <TableHead className="text-right">Resterend</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vacationBalances?.map((b) => (
                        <TableRow key={b.userId} data-testid={`row-balance-${b.userId}`}>
                          <TableCell className="font-medium text-sm">{b.userName}</TableCell>
                          <TableCell className="text-right text-sm">{b.totalDays}</TableCell>
                          <TableCell className="text-right text-sm">{b.usedDays}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={b.remainingDays <= 3 ? "destructive" : b.remainingDays <= 10 ? "outline" : "default"} className="text-xs">
                              {b.remainingDays}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
