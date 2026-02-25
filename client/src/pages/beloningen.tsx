import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Award, Star, TrendingUp, ClipboardCheck, UserCheck, Gift, Printer } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import type { Reward, User } from "@shared/schema";
import { useAuth } from "@/lib/auth";

function FunctioneringForm({ users, currentUser }: { users?: User[]; currentUser?: User | null }) {
  const [formData, setFormData] = useState({
    medewerker: "",
    functie: "",
    afdeling: "",
    leidinggevende: "",
    datum: format(new Date(), "yyyy-MM-dd"),
    periode: "",
    terugblikTaken: "",
    terugblikResultaten: "",
    terugblikKnelpunten: "",
    werkinhoud: "",
    samenwerking: "",
    communicatie: "",
    leidinggeven: "",
    arbeidsomstandigheden: "",
    persoonlijkeOntwikkeling: "",
    scholingswensen: "",
    loopbaanwensen: "",
    doelstelling1: "",
    doelstelling1Termijn: "",
    doelstelling2: "",
    doelstelling2Termijn: "",
    doelstelling3: "",
    doelstelling3Termijn: "",
    afspraken: "",
    opmerkingMedewerker: "",
    opmerkingLeidinggevende: "",
  });

  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSelectEmployee = (userId: string) => {
    const emp = users?.find(u => u.id === userId);
    if (emp) {
      setFormData(prev => ({
        ...prev,
        medewerker: emp.fullName,
        functie: emp.role === "admin" ? "Beheerder" : emp.role === "manager" ? "Manager" : "Medewerker",
        afdeling: emp.department || "",
      }));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <p className="text-sm text-muted-foreground">Vul het formulier in en druk af voor ondertekening</p>
        <Button onClick={handlePrint} variant="outline" data-testid="button-print-functionering">
          <Printer className="h-4 w-4 mr-2" />
          Afdrukken
        </Button>
      </div>

      <div id="functionering-form" className="space-y-6 print:space-y-4">
        <Card className="border border-border/60 print:border print:shadow-none">
          <CardContent className="p-6 print:p-4">
            <h2 className="text-lg font-bold text-center mb-1 print:text-xl" data-testid="text-functionering-title">
              GESPREKSFORMULIER FUNCTIONERINGSGESPREK
            </h2>
            <p className="text-xs text-muted-foreground text-center mb-6 print:text-sm print:text-black">
              Vertrouwelijk
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:gap-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground print:text-black">Medewerker</label>
                {(currentUser?.role === "admin" || currentUser?.role === "manager") ? (
                  <div className="flex gap-2">
                    <Input
                      value={formData.medewerker}
                      onChange={(e) => updateField("medewerker", e.target.value)}
                      placeholder="Naam medewerker"
                      className="print:border-0 print:border-b print:rounded-none print:px-0 print:shadow-none"
                      data-testid="input-func-medewerker"
                    />
                    <Select onValueChange={handleSelectEmployee}>
                      <SelectTrigger className="w-[140px] print:hidden" data-testid="select-func-employee">
                        <SelectValue placeholder="Kies..." />
                      </SelectTrigger>
                      <SelectContent>
                        {users?.filter(u => u.active).map(u => (
                          <SelectItem key={u.id} value={u.id}>{u.fullName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <Input
                    value={formData.medewerker}
                    onChange={(e) => updateField("medewerker", e.target.value)}
                    placeholder="Naam medewerker"
                    className="print:border-0 print:border-b print:rounded-none print:px-0 print:shadow-none"
                    data-testid="input-func-medewerker"
                  />
                )}
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground print:text-black">Functie</label>
                <Input
                  value={formData.functie}
                  onChange={(e) => updateField("functie", e.target.value)}
                  placeholder="Functie"
                  className="print:border-0 print:border-b print:rounded-none print:px-0 print:shadow-none"
                  data-testid="input-func-functie"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground print:text-black">Afdeling</label>
                <Input
                  value={formData.afdeling}
                  onChange={(e) => updateField("afdeling", e.target.value)}
                  placeholder="Afdeling"
                  className="print:border-0 print:border-b print:rounded-none print:px-0 print:shadow-none"
                  data-testid="input-func-afdeling"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground print:text-black">Leidinggevende</label>
                <div className="flex gap-2">
                  <Input
                    value={formData.leidinggevende}
                    onChange={(e) => updateField("leidinggevende", e.target.value)}
                    placeholder="Naam leidinggevende"
                    className="print:border-0 print:border-b print:rounded-none print:px-0 print:shadow-none"
                    data-testid="input-func-leidinggevende"
                  />
                  <Select onValueChange={(val) => { const mgr = users?.find(u => u.id === val); if (mgr) updateField("leidinggevende", mgr.fullName); }}>
                    <SelectTrigger className="w-[140px] print:hidden" data-testid="select-func-leidinggevende">
                      <SelectValue placeholder="Kies..." />
                    </SelectTrigger>
                    <SelectContent>
                      {users?.filter(u => u.active && (u.role === "manager" || u.role === "admin")).map(u => (
                        <SelectItem key={u.id} value={u.id}>{u.fullName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground print:text-black">Datum gesprek</label>
                <Input
                  type="date"
                  value={formData.datum}
                  onChange={(e) => updateField("datum", e.target.value)}
                  className="print:border-0 print:border-b print:rounded-none print:px-0 print:shadow-none"
                  data-testid="input-func-datum"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground print:text-black">Beoordelingsperiode</label>
                <Input
                  value={formData.periode}
                  onChange={(e) => updateField("periode", e.target.value)}
                  placeholder="bijv. jan 2025 - dec 2025"
                  className="print:border-0 print:border-b print:rounded-none print:px-0 print:shadow-none"
                  data-testid="input-func-periode"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 print:border print:shadow-none print:break-inside-avoid">
          <CardContent className="p-6 print:p-4 space-y-4 print:space-y-2">
            <h3 className="font-semibold text-sm border-b pb-2 print:text-base">1. Terugblik vorige periode</h3>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground print:text-black">Welke taken/werkzaamheden zijn uitgevoerd?</label>
              <Textarea
                value={formData.terugblikTaken}
                onChange={(e) => updateField("terugblikTaken", e.target.value)}
                rows={3}
                className="print:border-0 print:border-b print:rounded-none print:px-0 print:shadow-none print:resize-none"
                data-testid="input-func-terugblik-taken"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground print:text-black">Welke resultaten zijn behaald?</label>
              <Textarea
                value={formData.terugblikResultaten}
                onChange={(e) => updateField("terugblikResultaten", e.target.value)}
                rows={3}
                className="print:border-0 print:border-b print:rounded-none print:px-0 print:shadow-none print:resize-none"
                data-testid="input-func-terugblik-resultaten"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground print:text-black">Welke knelpunten zijn er ervaren?</label>
              <Textarea
                value={formData.terugblikKnelpunten}
                onChange={(e) => updateField("terugblikKnelpunten", e.target.value)}
                rows={3}
                className="print:border-0 print:border-b print:rounded-none print:px-0 print:shadow-none print:resize-none"
                data-testid="input-func-terugblik-knelpunten"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 print:border print:shadow-none print:break-inside-avoid">
          <CardContent className="p-6 print:p-4 space-y-4 print:space-y-2">
            <h3 className="font-semibold text-sm border-b pb-2 print:text-base">2. Werk en werkomstandigheden</h3>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground print:text-black">Werkinhoud en takenpakket</label>
              <Textarea
                value={formData.werkinhoud}
                onChange={(e) => updateField("werkinhoud", e.target.value)}
                rows={3}
                placeholder="Hoe ervaart u uw huidige takenpakket?"
                className="print:border-0 print:border-b print:rounded-none print:px-0 print:shadow-none print:resize-none"
                data-testid="input-func-werkinhoud"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground print:text-black">Arbeidsomstandigheden</label>
              <Textarea
                value={formData.arbeidsomstandigheden}
                onChange={(e) => updateField("arbeidsomstandigheden", e.target.value)}
                rows={2}
                placeholder="Hoe ervaart u de werkomgeving en faciliteiten?"
                className="print:border-0 print:border-b print:rounded-none print:px-0 print:shadow-none print:resize-none"
                data-testid="input-func-arbeidsomstandigheden"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 print:border print:shadow-none print:break-inside-avoid">
          <CardContent className="p-6 print:p-4 space-y-4 print:space-y-2">
            <h3 className="font-semibold text-sm border-b pb-2 print:text-base">3. Samenwerking en communicatie</h3>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground print:text-black">Samenwerking met collega's</label>
              <Textarea
                value={formData.samenwerking}
                onChange={(e) => updateField("samenwerking", e.target.value)}
                rows={3}
                placeholder="Hoe verloopt de samenwerking binnen en buiten de afdeling?"
                className="print:border-0 print:border-b print:rounded-none print:px-0 print:shadow-none print:resize-none"
                data-testid="input-func-samenwerking"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground print:text-black">Communicatie</label>
              <Textarea
                value={formData.communicatie}
                onChange={(e) => updateField("communicatie", e.target.value)}
                rows={2}
                placeholder="Hoe ervaart u de communicatie met leidinggevende en collega's?"
                className="print:border-0 print:border-b print:rounded-none print:px-0 print:shadow-none print:resize-none"
                data-testid="input-func-communicatie"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground print:text-black">Leidinggeven (indien van toepassing)</label>
              <Textarea
                value={formData.leidinggeven}
                onChange={(e) => updateField("leidinggeven", e.target.value)}
                rows={2}
                placeholder="Hoe ervaart u de stijl van leidinggeven?"
                className="print:border-0 print:border-b print:rounded-none print:px-0 print:shadow-none print:resize-none"
                data-testid="input-func-leidinggeven"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 print:border print:shadow-none print:break-inside-avoid">
          <CardContent className="p-6 print:p-4 space-y-4 print:space-y-2">
            <h3 className="font-semibold text-sm border-b pb-2 print:text-base">4. Persoonlijke ontwikkeling</h3>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground print:text-black">Persoonlijke ontwikkeling en competenties</label>
              <Textarea
                value={formData.persoonlijkeOntwikkeling}
                onChange={(e) => updateField("persoonlijkeOntwikkeling", e.target.value)}
                rows={3}
                placeholder="Welke competenties wilt u verder ontwikkelen?"
                className="print:border-0 print:border-b print:rounded-none print:px-0 print:shadow-none print:resize-none"
                data-testid="input-func-persoonlijke-ontwikkeling"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground print:text-black">Scholings- en opleidingswensen</label>
              <Textarea
                value={formData.scholingswensen}
                onChange={(e) => updateField("scholingswensen", e.target.value)}
                rows={2}
                placeholder="Welke cursussen of opleidingen heeft u nodig?"
                className="print:border-0 print:border-b print:rounded-none print:px-0 print:shadow-none print:resize-none"
                data-testid="input-func-scholingswensen"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground print:text-black">Loopbaanwensen</label>
              <Textarea
                value={formData.loopbaanwensen}
                onChange={(e) => updateField("loopbaanwensen", e.target.value)}
                rows={2}
                placeholder="Wat zijn uw loopbaanwensen en ambities?"
                className="print:border-0 print:border-b print:rounded-none print:px-0 print:shadow-none print:resize-none"
                data-testid="input-func-loopbaanwensen"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 print:border print:shadow-none print:break-inside-avoid">
          <CardContent className="p-6 print:p-4 space-y-4 print:space-y-2">
            <h3 className="font-semibold text-sm border-b pb-2 print:text-base">5. Doelstellingen komende periode</h3>
            <div className="space-y-3 print:space-y-2">
              {[1, 2, 3].map((n) => (
                <div key={n} className="grid grid-cols-1 md:grid-cols-[1fr_180px] gap-2 items-start">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground print:text-black">Doelstelling {n}</label>
                    <Textarea
                      value={(formData as any)[`doelstelling${n}`]}
                      onChange={(e) => updateField(`doelstelling${n}`, e.target.value)}
                      rows={2}
                      placeholder={`Omschrijving doelstelling ${n}`}
                      className="print:border-0 print:border-b print:rounded-none print:px-0 print:shadow-none print:resize-none"
                      data-testid={`input-func-doelstelling-${n}`}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground print:text-black">Termijn</label>
                    <Input
                      value={(formData as any)[`doelstelling${n}Termijn`]}
                      onChange={(e) => updateField(`doelstelling${n}Termijn`, e.target.value)}
                      placeholder="bijv. Q2 2026"
                      className="print:border-0 print:border-b print:rounded-none print:px-0 print:shadow-none"
                      data-testid={`input-func-termijn-${n}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 print:border print:shadow-none print:break-inside-avoid">
          <CardContent className="p-6 print:p-4 space-y-4 print:space-y-2">
            <h3 className="font-semibold text-sm border-b pb-2 print:text-base">6. Afspraken en opmerkingen</h3>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground print:text-black">Gemaakte afspraken</label>
              <Textarea
                value={formData.afspraken}
                onChange={(e) => updateField("afspraken", e.target.value)}
                rows={3}
                placeholder="Welke concrete afspraken zijn er gemaakt?"
                className="print:border-0 print:border-b print:rounded-none print:px-0 print:shadow-none print:resize-none"
                data-testid="input-func-afspraken"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground print:text-black">Opmerkingen medewerker</label>
              <Textarea
                value={formData.opmerkingMedewerker}
                onChange={(e) => updateField("opmerkingMedewerker", e.target.value)}
                rows={2}
                className="print:border-0 print:border-b print:rounded-none print:px-0 print:shadow-none print:resize-none"
                data-testid="input-func-opmerking-medewerker"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground print:text-black">Opmerkingen leidinggevende</label>
              <Textarea
                value={formData.opmerkingLeidinggevende}
                onChange={(e) => updateField("opmerkingLeidinggevende", e.target.value)}
                rows={2}
                className="print:border-0 print:border-b print:rounded-none print:px-0 print:shadow-none print:resize-none"
                data-testid="input-func-opmerking-leidinggevende"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 print:border print:shadow-none print:break-inside-avoid">
          <CardContent className="p-6 print:p-4 space-y-6 print:space-y-4">
            <h3 className="font-semibold text-sm border-b pb-2 print:text-base">7. Ondertekening</h3>
            <p className="text-xs text-muted-foreground print:text-black">
              Beide partijen verklaren dat dit gesprek heeft plaatsgevonden en dat de inhoud van dit formulier een correcte weergave is van het besprokene.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-8 print:space-y-12">
                <div>
                  <p className="text-xs font-medium text-muted-foreground print:text-black mb-1">Datum</p>
                  <div className="border-b border-dashed h-6 print:h-8"></div>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground print:text-black mb-1">Handtekening medewerker</p>
                  <div className="border-b border-dashed h-12 print:h-16"></div>
                </div>
              </div>
              <div className="space-y-8 print:space-y-12">
                <div>
                  <p className="text-xs font-medium text-muted-foreground print:text-black mb-1">Datum</p>
                  <div className="border-b border-dashed h-6 print:h-8"></div>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground print:text-black mb-1">Handtekening leidinggevende</p>
                  <div className="border-b border-dashed h-12 print:h-16"></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end print:hidden">
        <Button onClick={handlePrint} data-testid="button-print-functionering-bottom">
          <Printer className="h-4 w-4 mr-2" />
          Formulier Afdrukken
        </Button>
      </div>
    </div>
  );
}

const rewardFormSchema = z.object({
  userId: z.string().min(1, "Selecteer een medewerker"),
  points: z.coerce.number().min(1, "Minimaal 1 punt"),
  reason: z.string().min(1, "Reden is verplicht"),
});

export default function BeloningenPage() {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("functionering");
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: rewards, isLoading } = useQuery<(Reward & { userName?: string })[]>({
    queryKey: ["/api/rewards"],
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: leaderboard } = useQuery<{ userId: string; userName: string; totalPoints: number }[]>({
    queryKey: ["/api/rewards/leaderboard"],
  });

  const form = useForm<z.infer<typeof rewardFormSchema>>({
    resolver: zodResolver(rewardFormSchema),
    defaultValues: { userId: "", points: 10, reason: "" },
  });

  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof rewardFormSchema>) => {
      await apiRequest("POST", "/api/rewards", {
        ...data,
        awardedBy: user?.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rewards"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rewards/leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Beloning toegekend" });
      setOpen(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Fout bij toekennen", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4 overflow-auto h-full">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-beloningen-title">Beloningen</h1>
          <p className="text-muted-foreground text-sm">Functionering, beoordeling en beloningsysteem</p>
        </div>
        {activeTab === "beloningsysteem" && (user?.role === "admin" || user?.role === "manager") && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-reward">
                <Plus className="h-4 w-4 mr-2" />
                Punten Toekennen
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Punten Toekennen</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
                  <FormField control={form.control} name="userId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Medewerker</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-reward-user"><SelectValue placeholder="Selecteer medewerker" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {users?.map((u) => (
                            <SelectItem key={u.id} value={u.id}>{u.fullName}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="points" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Punten</FormLabel>
                      <FormControl><Input type="number" {...field} min={1} data-testid="input-reward-points" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="reason" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reden</FormLabel>
                      <FormControl><Input {...field} data-testid="input-reward-reason" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-reward">
                    {createMutation.isPending ? "Toekennen..." : "Punten Toekennen"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex gap-1 border-b">
        <button
          onClick={() => setActiveTab("functionering")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "functionering"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          data-testid="tab-functionering"
        >
          <ClipboardCheck className="h-4 w-4 inline mr-1.5 -mt-0.5" />
          Functionering
        </button>
        <button
          onClick={() => setActiveTab("beoordeling")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "beoordeling"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          data-testid="tab-beoordeling"
        >
          <UserCheck className="h-4 w-4 inline mr-1.5 -mt-0.5" />
          Beoordeling
        </button>
        <button
          onClick={() => setActiveTab("beloningsysteem")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "beloningsysteem"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          data-testid="tab-beloningsysteem"
        >
          <Gift className="h-4 w-4 inline mr-1.5 -mt-0.5" />
          Beloningsysteem
        </button>
      </div>

      {activeTab === "functionering" && (
        <FunctioneringForm users={users} currentUser={user} />
      )}

      {activeTab === "beoordeling" && (
        <Card>
          <CardContent className="flex flex-col items-center py-10">
            <UserCheck className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground text-sm">Beoordelingen — binnenkort beschikbaar</p>
          </CardContent>
        </Card>
      )}

      {activeTab === "beloningsysteem" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center gap-2 pb-3">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold text-sm">Ranglijst</h3>
            </CardHeader>
            <CardContent className="pt-0">
              {(!leaderboard || leaderboard.length === 0) ? (
                <p className="text-sm text-muted-foreground text-center py-6">Nog geen punten toegekend</p>
              ) : (
                <div className="space-y-3">
                  {leaderboard.map((entry, i) => {
                    const initials = entry.userName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
                    return (
                      <div key={entry.userId} className="flex items-center gap-3 p-2 rounded-md hover-elevate" data-testid={`leaderboard-${entry.userId}`}>
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          i === 0 ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                          : i === 1 ? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                          : i === 2 ? "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
                          : "bg-muted text-muted-foreground"
                        }`}>
                          {i + 1}
                        </div>
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">{initials}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{entry.userName}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 text-yellow-500" />
                          <span className="text-sm font-bold">{entry.totalPoints}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center gap-2 pb-3">
              <Award className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold text-sm">Recente Beloningen</h3>
            </CardHeader>
            <CardContent className="pt-0">
              {(!rewards || rewards.length === 0) ? (
                <p className="text-sm text-muted-foreground text-center py-6">Nog geen beloningen</p>
              ) : (
                <div className="space-y-3">
                  {rewards.slice(0, 10).map((reward) => (
                    <div key={reward.id} className="flex items-start gap-3 p-2 rounded-md hover-elevate" data-testid={`reward-item-${reward.id}`}>
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                        <Award className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium">{(reward as any).userName || "Medewerker"}</p>
                          <Badge variant="secondary" className="text-xs gap-1">
                            <Star className="h-3 w-3" /> +{reward.points}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{reward.reason}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(reward.awardedAt), "d MMM yyyy", { locale: nl })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
