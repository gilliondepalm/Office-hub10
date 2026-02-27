import { useState, useEffect } from "react";
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
import { Plus, Award, Star, TrendingUp, ClipboardCheck, UserCheck, Gift, Printer, Save, ChevronLeft, ChevronRight, Eye, FileText, Trash2, Settings, PlusCircle, X, Pencil } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import type { Reward, User, FunctioneringReview, Competency, BeoordelingReview, BeoordelingScore } from "@shared/schema";
import { useAuth } from "@/lib/auth";
import { isAdminRole } from "@shared/schema";

function ReadOnlyFunctioneringForm({ review }: { review: FunctioneringReview }) {
  const fieldValue = (val: string | null | undefined) => val || "-";

  return (
    <div className="space-y-4 print:space-y-3 print:break-before-page">
      <Card className="border border-border/60 print:border print:shadow-none print:bg-white bg-card">
        <CardContent className="p-6 print:p-4">
          <h2 className="text-lg font-bold text-center mb-1 print:text-xl">
            GESPREKSFORMULIER FUNCTIONERINGSGESPREK
          </h2>
          <p className="text-xs text-muted-foreground text-center mb-6 print:text-sm print:text-black">
            Vertrouwelijk
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:gap-2">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground print:text-black">Medewerker</label>
              <p className="text-sm border-b border-border/60 pb-1 print:border-b print:border-gray-400">{fieldValue(review.medewerker)}</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground print:text-black">Functie</label>
              <p className="text-sm border-b border-border/60 pb-1 print:border-b print:border-gray-400">{fieldValue(review.functie)}</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground print:text-black">Afdeling</label>
              <p className="text-sm border-b border-border/60 pb-1 print:border-b print:border-gray-400">{fieldValue(review.afdeling)}</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground print:text-black">Leidinggevende</label>
              <p className="text-sm border-b border-border/60 pb-1 print:border-b print:border-gray-400">{fieldValue(review.leidinggevende)}</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground print:text-black">Datum gesprek</label>
              <p className="text-sm border-b border-border/60 pb-1 print:border-b print:border-gray-400">{format(new Date(review.datum), "d MMMM yyyy", { locale: nl })}</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground print:text-black">Beoordelingsperiode</label>
              <p className="text-sm border-b border-border/60 pb-1 print:border-b print:border-gray-400">{fieldValue(review.periode)}</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground print:text-black">Functioneringsjaar</label>
              <p className="text-sm border-b border-border/60 pb-1 print:border-b print:border-gray-400">{review.year}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border/60 print:border print:shadow-none print:bg-white print:break-inside-avoid bg-card">
        <CardContent className="p-6 print:p-4 space-y-3 print:space-y-2">
          <h3 className="font-semibold text-sm border-b pb-2 print:text-base">1. Terugblik vorige periode</h3>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground print:text-black">Welke taken/werkzaamheden zijn uitgevoerd?</label>
            <p className="text-sm whitespace-pre-wrap">{fieldValue(review.terugblikTaken)}</p>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground print:text-black">Welke resultaten zijn behaald?</label>
            <p className="text-sm whitespace-pre-wrap">{fieldValue(review.terugblikResultaten)}</p>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground print:text-black">Welke knelpunten zijn er ervaren?</label>
            <p className="text-sm whitespace-pre-wrap">{fieldValue(review.terugblikKnelpunten)}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border/60 print:border print:shadow-none print:bg-white print:break-inside-avoid bg-card">
        <CardContent className="p-6 print:p-4 space-y-3 print:space-y-2">
          <h3 className="font-semibold text-sm border-b pb-2 print:text-base">2. Werk en werkomstandigheden</h3>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground print:text-black">Werkinhoud en takenpakket</label>
            <p className="text-sm whitespace-pre-wrap">{fieldValue(review.werkinhoud)}</p>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground print:text-black">Arbeidsomstandigheden</label>
            <p className="text-sm whitespace-pre-wrap">{fieldValue(review.arbeidsomstandigheden)}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border/60 print:border print:shadow-none print:bg-white print:break-inside-avoid bg-card">
        <CardContent className="p-6 print:p-4 space-y-3 print:space-y-2">
          <h3 className="font-semibold text-sm border-b pb-2 print:text-base">3. Samenwerking en communicatie</h3>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground print:text-black">Samenwerking met collega's</label>
            <p className="text-sm whitespace-pre-wrap">{fieldValue(review.samenwerking)}</p>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground print:text-black">Communicatie</label>
            <p className="text-sm whitespace-pre-wrap">{fieldValue(review.communicatie)}</p>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground print:text-black">Leidinggeven (indien van toepassing)</label>
            <p className="text-sm whitespace-pre-wrap">{fieldValue(review.leidinggeven)}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border/60 print:border print:shadow-none print:bg-white print:break-inside-avoid bg-card">
        <CardContent className="p-6 print:p-4 space-y-3 print:space-y-2">
          <h3 className="font-semibold text-sm border-b pb-2 print:text-base">4. Persoonlijke ontwikkeling</h3>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground print:text-black">Persoonlijke ontwikkeling en competenties</label>
            <p className="text-sm whitespace-pre-wrap">{fieldValue(review.persoonlijkeOntwikkeling)}</p>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground print:text-black">Scholings- en opleidingswensen</label>
            <p className="text-sm whitespace-pre-wrap">{fieldValue(review.scholingswensen)}</p>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground print:text-black">Loopbaanwensen</label>
            <p className="text-sm whitespace-pre-wrap">{fieldValue(review.loopbaanwensen)}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border/60 print:border print:shadow-none print:bg-white print:break-inside-avoid bg-card">
        <CardContent className="p-6 print:p-4 space-y-3 print:space-y-2">
          <h3 className="font-semibold text-sm border-b pb-2 print:text-base">5. Doelstellingen komende periode</h3>
          {[1, 2, 3].map((n) => {
            const doel = (review as any)[`doelstelling${n}`];
            const termijn = (review as any)[`doelstelling${n}Termijn`];
            return (
              <div key={n} className="grid grid-cols-1 md:grid-cols-[1fr_180px] gap-2">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground print:text-black">Doelstelling {n}</label>
                  <p className="text-sm whitespace-pre-wrap">{fieldValue(doel)}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground print:text-black">Termijn</label>
                  <p className="text-sm">{fieldValue(termijn)}</p>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className="border border-border/60 print:border print:shadow-none print:bg-white print:break-inside-avoid bg-card">
        <CardContent className="p-6 print:p-4 space-y-3 print:space-y-2">
          <h3 className="font-semibold text-sm border-b pb-2 print:text-base">6. Afspraken en opmerkingen</h3>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground print:text-black">Gemaakte afspraken</label>
            <p className="text-sm whitespace-pre-wrap">{fieldValue(review.afspraken)}</p>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground print:text-black">Opmerkingen medewerker</label>
            <p className="text-sm whitespace-pre-wrap">{fieldValue(review.opmerkingMedewerker)}</p>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground print:text-black">Opmerkingen leidinggevende</label>
            <p className="text-sm whitespace-pre-wrap">{fieldValue(review.opmerkingLeidinggevende)}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border/60 print:border print:shadow-none print:bg-white print:break-inside-avoid bg-card">
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
  );
}

function FunctioneringForm({ users, currentUser }: { users?: User[]; currentUser?: User | null }) {
  const { toast } = useToast();
  const isAdmin = isAdminRole(currentUser?.role);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [viewMode, setViewMode] = useState<"form" | "overview">("overview");
  const [viewingReview, setViewingReview] = useState<FunctioneringReview | null>(null);

  const emptyForm = {
    medewerker: "",
    functie: "",
    afdeling: "",
    leidinggevende: "",
    datum: format(new Date(), "yyyy-MM-dd"),
    periode: "",
    functioneringsJaar: new Date().getFullYear(),
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
  };

  const [formData, setFormData] = useState(emptyForm);

  const { data: reviewsByYear, isLoading: loadingReviews } = useQuery<(FunctioneringReview & { userName?: string })[]>({
    queryKey: ["/api/functionering", selectedYear],
    queryFn: async () => {
      const res = await fetch(`/api/functionering?year=${selectedYear}`, { credentials: "include" });
      if (!res.ok) throw new Error("Ophalen mislukt");
      return res.json();
    },
    enabled: isAdmin,
  });

  const { data: myReviews } = useQuery<FunctioneringReview[]>({
    queryKey: ["/api/functionering/mine"],
    enabled: !isAdmin,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      await apiRequest("POST", "/api/functionering", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/functionering"] });
      queryClient.invalidateQueries({ queryKey: ["/api/functionering/mine"] });
      toast({ title: "Functioneringsgesprek opgeslagen" });
      handleBackToOverview();
    },
    onError: () => {
      toast({ title: "Opslaan mislukt", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/functionering/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/functionering"] });
      queryClient.invalidateQueries({ queryKey: ["/api/functionering/mine"] });
      toast({ title: "Functioneringsgesprek verwijderd" });
    },
    onError: () => {
      toast({ title: "Verwijderen mislukt", variant: "destructive" });
    },
  });

  const updateField = (field: string, value: string) => {
    if (!isAdmin) return;
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSelectEmployee = (userId: string) => {
    const emp = users?.find(u => u.id === userId);
    if (emp) {
      setSelectedUserId(userId);
      setFormData(prev => ({
        ...prev,
        medewerker: emp.fullName,
        functie: emp.role === "directeur" ? "Directeur" : emp.role === "admin" ? "Beheerder" : emp.role === "manager" ? "Manager" : "Medewerker",
        afdeling: emp.department || "",
      }));
    }
  };

  const handleSave = () => {
    if (!formData.medewerker) {
      toast({ title: "Selecteer eerst een medewerker", variant: "destructive" });
      return;
    }
    const userId = selectedUserId || currentUser?.id;
    if (!userId) return;

    const year = formData.functioneringsJaar;
    saveMutation.mutate({
      ...formData,
      userId,
      year,
      editId: viewingReview?.id,
      createdBy: currentUser?.id,
    });
  };

  const handleViewReview = (review: FunctioneringReview) => {
    setViewingReview(review);
    setFormData({
      medewerker: review.medewerker,
      functie: review.functie || "",
      afdeling: review.afdeling || "",
      leidinggevende: review.leidinggevende || "",
      datum: review.datum,
      periode: review.periode || "",
      functioneringsJaar: review.year,
      terugblikTaken: review.terugblikTaken || "",
      terugblikResultaten: review.terugblikResultaten || "",
      terugblikKnelpunten: review.terugblikKnelpunten || "",
      werkinhoud: review.werkinhoud || "",
      samenwerking: review.samenwerking || "",
      communicatie: review.communicatie || "",
      leidinggeven: review.leidinggeven || "",
      arbeidsomstandigheden: review.arbeidsomstandigheden || "",
      persoonlijkeOntwikkeling: review.persoonlijkeOntwikkeling || "",
      scholingswensen: review.scholingswensen || "",
      loopbaanwensen: review.loopbaanwensen || "",
      doelstelling1: review.doelstelling1 || "",
      doelstelling1Termijn: review.doelstelling1Termijn || "",
      doelstelling2: review.doelstelling2 || "",
      doelstelling2Termijn: review.doelstelling2Termijn || "",
      doelstelling3: review.doelstelling3 || "",
      doelstelling3Termijn: review.doelstelling3Termijn || "",
      afspraken: review.afspraken || "",
      opmerkingMedewerker: review.opmerkingMedewerker || "",
      opmerkingLeidinggevende: review.opmerkingLeidinggevende || "",
    });
    setSelectedUserId(review.userId);
    setViewMode("form");
  };

  const handleNewForm = () => {
    setFormData(emptyForm);
    setSelectedUserId("");
    setViewingReview(null);
    setViewMode("form");
  };

  const handleBackToOverview = () => {
    setViewMode("overview");
    setViewingReview(null);
    setFormData(emptyForm);
    setSelectedUserId("");
  };

  const reviewsToShow = isAdmin ? reviewsByYear : myReviews;

  if (viewMode === "overview") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between print:hidden">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={() => setSelectedYear(y => y - 1)} data-testid="button-year-prev">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-lg font-semibold min-w-[60px] text-center" data-testid="text-selected-year">{selectedYear}</span>
            <Button variant="outline" size="icon" onClick={() => setSelectedYear(y => y + 1)} data-testid="button-year-next">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          {isAdmin && (
            <Button onClick={handleNewForm} data-testid="button-new-functionering">
              <Plus className="h-4 w-4 mr-2" />
              Nieuw Gesprek
            </Button>
          )}
        </div>

        {loadingReviews ? (
          <div className="space-y-3">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        ) : !reviewsToShow || reviewsToShow.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center py-10">
              <FileText className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground text-sm">Geen functioneringsgesprekken gevonden voor {selectedYear}</p>
              {isAdmin && (
                <Button variant="link" onClick={handleNewForm} className="mt-2" data-testid="button-new-functionering-empty">
                  Nieuw gesprek aanmaken
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {reviewsToShow.map((review) => (
              <Card key={review.id} className="border border-border/60" data-testid={`review-card-${review.id}`}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                      <ClipboardCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium" data-testid={`review-name-${review.id}`}>
                        {review.medewerker}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{review.functie}</span>
                        {review.afdeling && <span>- {review.afdeling}</span>}
                        <span>- {format(new Date(review.datum), "d MMM yyyy", { locale: nl })}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleViewReview(review)} data-testid={`button-view-review-${review.id}`}>
                      <Eye className="h-4 w-4 mr-1" />
                      Bekijken
                    </Button>
                    {isAdmin && (
                      <Button variant="outline" size="sm" onClick={() => deleteMutation.mutate(review.id)} data-testid={`button-delete-review-${review.id}`}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleBackToOverview} data-testid="button-back-overview">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Overzicht
          </Button>
          <p className="text-sm text-muted-foreground">
            {isAdmin
              ? (viewingReview ? "Bekijk of bewerk het functioneringsgesprek" : "Vul het formulier in en sla op")
              : "Bekijk het functioneringsgesprek"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button onClick={handleSave} disabled={saveMutation.isPending} data-testid="button-save-functionering">
              <Save className="h-4 w-4 mr-2" />
              {saveMutation.isPending ? "Opslaan..." : "Opslaan"}
            </Button>
          )}
          <Button onClick={handlePrint} variant="outline" data-testid="button-print-functionering">
            <Printer className="h-4 w-4 mr-2" />
            Afdrukken
          </Button>
        </div>
      </div>

      <div id="functionering-form" className="space-y-6 print:hidden">
        <Card className="border border-border/60 print:border print:shadow-none print:bg-white">
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
                {isAdmin ? (
                  <div className="flex gap-2">
                    <Input
                      value={formData.medewerker}
                      onChange={(e) => updateField("medewerker", e.target.value)}
                      placeholder="Naam medewerker"
                      className="print:border-0 print:border-b print:rounded-none print:px-0 print:shadow-none"
                      data-testid="input-func-medewerker"
                    />
                    <Select onValueChange={handleSelectEmployee} value={selectedUserId}>
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
                    readOnly
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
                  readOnly={!isAdmin}
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
                  readOnly={!isAdmin}
                  placeholder="Afdeling"
                  className="print:border-0 print:border-b print:rounded-none print:px-0 print:shadow-none"
                  data-testid="input-func-afdeling"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground print:text-black">Leidinggevende</label>
                {isAdmin ? (
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
                        {users?.filter(u => u.active && (u.role === "manager" || isAdminRole(u.role))).map(u => (
                          <SelectItem key={u.id} value={u.id}>{u.fullName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <Input
                    value={formData.leidinggevende}
                    readOnly
                    className="print:border-0 print:border-b print:rounded-none print:px-0 print:shadow-none"
                    data-testid="input-func-leidinggevende"
                  />
                )}
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground print:text-black">Datum gesprek</label>
                <Input
                  type="date"
                  value={formData.datum}
                  onChange={(e) => updateField("datum", e.target.value)}
                  readOnly={!isAdmin}
                  className="print:border-0 print:border-b print:rounded-none print:px-0 print:shadow-none"
                  data-testid="input-func-datum"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground print:text-black">Beoordelingsperiode</label>
                  <Input
                    value={formData.periode}
                    onChange={(e) => updateField("periode", e.target.value)}
                    readOnly={!isAdmin}
                    placeholder="bijv. jan 2025 - dec 2025"
                    className="print:border-0 print:border-b print:rounded-none print:px-0 print:shadow-none"
                    data-testid="input-func-periode"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground print:text-black">Functioneringsjaar</label>
                  <Input
                    type="number"
                    value={formData.functioneringsJaar}
                    onChange={e => setFormData(prev => ({ ...prev, functioneringsJaar: parseInt(e.target.value) || new Date().getFullYear() }))}
                    readOnly={!isAdmin}
                    className="print:border-0 print:border-b print:rounded-none print:px-0 print:shadow-none"
                    data-testid="input-func-jaar"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 print:border print:shadow-none print:bg-white print:break-inside-avoid">
          <CardContent className="p-6 print:p-4 space-y-4 print:space-y-2">
            <h3 className="font-semibold text-sm border-b pb-2 print:text-base">1. Terugblik vorige periode</h3>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground print:text-black">Welke taken/werkzaamheden zijn uitgevoerd?</label>
              <Textarea
                value={formData.terugblikTaken}
                onChange={(e) => updateField("terugblikTaken", e.target.value)}
                readOnly={!isAdmin}
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
                readOnly={!isAdmin}
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
                readOnly={!isAdmin}
                rows={3}
                className="print:border-0 print:border-b print:rounded-none print:px-0 print:shadow-none print:resize-none"
                data-testid="input-func-terugblik-knelpunten"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 print:border print:shadow-none print:bg-white print:break-inside-avoid">
          <CardContent className="p-6 print:p-4 space-y-4 print:space-y-2">
            <h3 className="font-semibold text-sm border-b pb-2 print:text-base">2. Werk en werkomstandigheden</h3>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground print:text-black">Werkinhoud en takenpakket</label>
              <Textarea
                value={formData.werkinhoud}
                onChange={(e) => updateField("werkinhoud", e.target.value)}
                readOnly={!isAdmin}
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
                readOnly={!isAdmin}
                rows={2}
                placeholder="Hoe ervaart u de werkomgeving en faciliteiten?"
                className="print:border-0 print:border-b print:rounded-none print:px-0 print:shadow-none print:resize-none"
                data-testid="input-func-arbeidsomstandigheden"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 print:border print:shadow-none print:bg-white print:break-inside-avoid">
          <CardContent className="p-6 print:p-4 space-y-4 print:space-y-2">
            <h3 className="font-semibold text-sm border-b pb-2 print:text-base">3. Samenwerking en communicatie</h3>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground print:text-black">Samenwerking met collega's</label>
              <Textarea
                value={formData.samenwerking}
                onChange={(e) => updateField("samenwerking", e.target.value)}
                readOnly={!isAdmin}
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
                readOnly={!isAdmin}
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
                readOnly={!isAdmin}
                rows={2}
                placeholder="Hoe ervaart u de stijl van leidinggeven?"
                className="print:border-0 print:border-b print:rounded-none print:px-0 print:shadow-none print:resize-none"
                data-testid="input-func-leidinggeven"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 print:border print:shadow-none print:bg-white print:break-inside-avoid">
          <CardContent className="p-6 print:p-4 space-y-4 print:space-y-2">
            <h3 className="font-semibold text-sm border-b pb-2 print:text-base">4. Persoonlijke ontwikkeling</h3>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground print:text-black">Persoonlijke ontwikkeling en competenties</label>
              <Textarea
                value={formData.persoonlijkeOntwikkeling}
                onChange={(e) => updateField("persoonlijkeOntwikkeling", e.target.value)}
                readOnly={!isAdmin}
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
                readOnly={!isAdmin}
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
                readOnly={!isAdmin}
                rows={2}
                placeholder="Wat zijn uw loopbaanwensen en ambities?"
                className="print:border-0 print:border-b print:rounded-none print:px-0 print:shadow-none print:resize-none"
                data-testid="input-func-loopbaanwensen"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 print:border print:shadow-none print:bg-white print:break-inside-avoid">
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
                      readOnly={!isAdmin}
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
                      readOnly={!isAdmin}
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

        <Card className="border border-border/60 print:border print:shadow-none print:bg-white print:break-inside-avoid">
          <CardContent className="p-6 print:p-4 space-y-4 print:space-y-2">
            <h3 className="font-semibold text-sm border-b pb-2 print:text-base">6. Afspraken en opmerkingen</h3>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground print:text-black">Gemaakte afspraken</label>
              <Textarea
                value={formData.afspraken}
                onChange={(e) => updateField("afspraken", e.target.value)}
                readOnly={!isAdmin}
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
                readOnly={!isAdmin}
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
                readOnly={!isAdmin}
                rows={2}
                className="print:border-0 print:border-b print:rounded-none print:px-0 print:shadow-none print:resize-none"
                data-testid="input-func-opmerking-leidinggevende"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 print:border print:shadow-none print:bg-white print:break-inside-avoid">
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

      <div className="hidden print:block">
        <ReadOnlyFunctioneringForm review={{
          ...formData,
          id: viewingReview?.id || "",
          userId: viewingReview?.userId || selectedUserId || "",
          year: formData.functioneringsJaar,
          createdBy: viewingReview?.createdBy || currentUser?.id || "",
          createdAt: viewingReview?.createdAt || new Date().toISOString(),
          updatedAt: viewingReview?.updatedAt || null,
          userName: viewingReview?.userName || formData.medewerker,
        } as FunctioneringReview} />
      </div>

      <div className="flex justify-end gap-2 print:hidden">
        {isAdmin && (
          <Button onClick={handleSave} disabled={saveMutation.isPending} data-testid="button-save-functionering-bottom">
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? "Opslaan..." : "Opslaan"}
          </Button>
        )}
        <Button onClick={handlePrint} variant="outline" data-testid="button-print-functionering-bottom">
          <Printer className="h-4 w-4 mr-2" />
          Afdrukken
        </Button>
      </div>
    </div>
  );
}

function BeoordelingSection({ users, currentUser }: { users?: User[]; currentUser?: User | null }) {
  const { toast } = useToast();
  const isAdmin = isAdminRole(currentUser?.role);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedFunctie, setSelectedFunctie] = useState<string>("");
  const [viewMode, setViewMode] = useState<"overview" | "form" | "competencies">("overview");
  const [viewingReview, setViewingReview] = useState<BeoordelingReview | null>(null);
  const [compFunctie, setCompFunctie] = useState<string>("");
  const [newCompName, setNewCompName] = useState("");
  const [newCompNorms, setNewCompNorms] = useState({ norm1: "", norm2: "", norm3: "", norm4: "", norm5: "" });
  const [showCompDropdown, setShowCompDropdown] = useState(false);
  const [editingCompId, setEditingCompId] = useState<string | null>(null);
  const [editCompName, setEditCompName] = useState("");
  const [editCompNorms, setEditCompNorms] = useState({ norm1: "", norm2: "", norm3: "", norm4: "", norm5: "" });
  const [formScores, setFormScores] = useState<Record<string, { score: number | null; toelichting: string }>>({});
  const [formData, setFormData] = useState({
    beoordelaar: "",
    datum: format(new Date(), "yyyy-MM-dd"),
    periode: "",
    beoordelingsJaar: new Date().getFullYear(),
    afspraken: "",
    opmerkingMedewerker: "",
    opmerkingBeoordelaar: "",
  });

  const { data: reviewsByYear, isLoading: loadingReviews } = useQuery<(BeoordelingReview & { userName?: string })[]>({
    queryKey: ["/api/beoordeling", selectedYear],
    queryFn: async () => {
      const res = await fetch(`/api/beoordeling?year=${selectedYear}`, { credentials: "include" });
      if (!res.ok) throw new Error("Ophalen mislukt");
      return res.json();
    },
    enabled: isAdmin,
  });

  const { data: myReviews } = useQuery<BeoordelingReview[]>({
    queryKey: ["/api/beoordeling/mine"],
    enabled: !isAdmin,
  });

  const { data: functieCompetencies } = useQuery<Competency[]>({
    queryKey: ["/api/competencies/functie", selectedFunctie],
    queryFn: async () => {
      const res = await fetch(`/api/competencies/functie/${encodeURIComponent(selectedFunctie)}`, { credentials: "include" });
      if (!res.ok) throw new Error("Ophalen mislukt");
      return res.json();
    },
    enabled: !!selectedFunctie && viewMode === "form",
  });

  const { data: manageCompetencies } = useQuery<Competency[]>({
    queryKey: ["/api/competencies/functie", compFunctie],
    queryFn: async () => {
      const res = await fetch(`/api/competencies/functie/${encodeURIComponent(compFunctie)}`, { credentials: "include" });
      if (!res.ok) throw new Error("Ophalen mislukt");
      return res.json();
    },
    enabled: !!compFunctie && viewMode === "competencies",
  });

  const { data: allCompetencies } = useQuery<Competency[]>({
    queryKey: ["/api/competencies"],
    enabled: viewMode === "competencies" || viewMode === "form",
  });

  const existingFuncties = [...new Set(allCompetencies?.map(c => c.functie) || [])].sort();

  const saveMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      await apiRequest("POST", "/api/beoordeling", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/beoordeling"] });
      queryClient.invalidateQueries({ queryKey: ["/api/beoordeling/mine"] });
      toast({ title: "Beoordeling opgeslagen" });
      setViewMode("overview");
      setViewingReview(null);
      setSelectedUserId("");
      setSelectedFunctie("");
      setFormScores({});
      setFormData({ beoordelaar: "", datum: format(new Date(), "yyyy-MM-dd"), periode: "", beoordelingsJaar: new Date().getFullYear(), afspraken: "", opmerkingMedewerker: "", opmerkingBeoordelaar: "" });
    },
    onError: () => {
      toast({ title: "Opslaan mislukt", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/beoordeling/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/beoordeling"] });
      toast({ title: "Beoordeling verwijderd" });
    },
  });

  const createCompMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      await apiRequest("POST", "/api/competencies", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/competencies/functie", compFunctie] });
      queryClient.invalidateQueries({ queryKey: ["/api/competencies"] });
      setNewCompName("");
      setNewCompNorms({ norm1: "", norm2: "", norm3: "", norm4: "", norm5: "" });
      toast({ title: "Competentie toegevoegd" });
    },
    onError: () => {
      toast({ title: "Toevoegen mislukt", variant: "destructive" });
    },
  });

  const updateCompMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, any> }) => {
      await apiRequest("PUT", `/api/competencies/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/competencies/functie", compFunctie] });
      queryClient.invalidateQueries({ queryKey: ["/api/competencies"] });
      setEditingCompId(null);
      toast({ title: "Competentie bijgewerkt" });
    },
  });

  const deleteCompMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/competencies/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/competencies/functie", compFunctie] });
      queryClient.invalidateQueries({ queryKey: ["/api/competencies"] });
      toast({ title: "Competentie verwijderd" });
    },
  });

  const scoreValues = Object.values(formScores).filter(s => s.score !== null).map(s => s.score as number);
  const totalScore = scoreValues.reduce((a, b) => a + b, 0);
  const averageScore = scoreValues.length > 0 ? (totalScore / scoreValues.length) : 0;

  const handleSelectEmployee = (userId: string) => {
    setSelectedUserId(userId);
    setFormScores({});
    const emp = users?.find(u => u.id === userId);
    if (emp && emp.functie) {
      setSelectedFunctie(emp.functie);
    } else {
      setSelectedFunctie("");
    }
  };

  const handleSave = () => {
    if (!selectedUserId) {
      toast({ title: "Selecteer eerst een medewerker", variant: "destructive" });
      return;
    }
    const emp = users?.find(u => u.id === selectedUserId);
    const year = formData.beoordelingsJaar;
    const scores = Object.entries(formScores).map(([competencyId, data]) => ({
      competencyId,
      score: data.score,
      toelichting: data.toelichting,
    }));
    saveMutation.mutate({
      userId: selectedUserId,
      year,
      medewerker: emp?.fullName || "",
      functie: selectedFunctie,
      afdeling: emp?.department || "",
      beoordelaar: formData.beoordelaar,
      datum: formData.datum,
      periode: formData.periode,
      totalScore: scoreValues.length > 0 ? `Totaal: ${totalScore} / Gemiddeld: ${averageScore.toFixed(1)}` : "",
      afspraken: formData.afspraken,
      opmerkingMedewerker: formData.opmerkingMedewerker,
      opmerkingBeoordelaar: formData.opmerkingBeoordelaar,
      createdBy: currentUser?.id,
      scores,
      ...(viewingReview ? { editId: viewingReview.id } : {}),
    });
  };

  const handleViewReview = async (review: BeoordelingReview) => {
    setViewingReview(review);
    setSelectedUserId(review.userId);
    setSelectedFunctie(review.functie || "");
    setFormData({
      beoordelaar: review.beoordelaar || "",
      datum: review.datum,
      periode: review.periode || "",
      beoordelingsJaar: review.year,
      afspraken: review.afspraken || "",
      opmerkingMedewerker: review.opmerkingMedewerker || "",
      opmerkingBeoordelaar: review.opmerkingBeoordelaar || "",
    });
    try {
      const res = await fetch(`/api/beoordeling/${review.id}/scores`, { credentials: "include" });
      if (res.ok) {
        const scores: (BeoordelingScore & { competencyName?: string })[] = await res.json();
        const scoresMap: Record<string, { score: number | null; toelichting: string }> = {};
        scores.forEach(s => {
          scoresMap[s.competencyId] = { score: s.score, toelichting: s.toelichting || "" };
        });
        setFormScores(scoresMap);
      }
    } catch {}
    setViewMode("form");
  };

  const handleNewForm = () => {
    setFormData({ beoordelaar: "", datum: format(new Date(), "yyyy-MM-dd"), periode: "", beoordelingsJaar: new Date().getFullYear(), afspraken: "", opmerkingMedewerker: "", opmerkingBeoordelaar: "" });
    setFormScores({});
    setSelectedUserId("");
    setSelectedFunctie("");
    setViewingReview(null);
    setViewMode("form");
  };

  const handleBackToOverview = () => {
    setViewMode("overview");
    setViewingReview(null);
    setFormScores({});
    setSelectedUserId("");
    setSelectedFunctie("");
  };

  const scoreLabels: Record<number, string> = {
    1: "Onvoldoende",
    2: "Nog te ontwikkelen",
    3: "Normaal/goed",
    4: "Zeer goed/aantoonbaar beter",
    5: "Uitstekend/voorbeeld voor anderen",
  };

  const reviewsToShow = isAdmin ? reviewsByYear : myReviews;

  if (viewMode === "competencies" && isAdmin) {
    const normLabels: Record<number, string> = { 1: "Onvoldoende", 2: "Nog te ontwikkelen", 3: "Normaal/goed", 4: "Zeer goed/aantoonbaar beter", 5: "Uitstekend/voorbeeld voor anderen" };
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleBackToOverview} data-testid="button-back-overview-comp">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Overzicht
            </Button>
            <h3 className="font-semibold text-sm">Competenties per functie beheren</h3>
          </div>
        </div>

        <Card className="border border-border/60">
          <CardContent className="p-4 space-y-3">
            <label className="text-xs font-medium text-muted-foreground">Functie</label>
            <div className="flex gap-2">
              <Input
                value={compFunctie}
                onChange={e => setCompFunctie(e.target.value)}
                placeholder="Typ een functienaam (bijv. Landmeter, Administratief Medewerker)"
                data-testid="input-comp-functie"
              />
            </div>
            {existingFuncties.length > 0 && (
              <div className="flex flex-wrap gap-1">
                <span className="text-xs text-muted-foreground mr-1">Bestaand:</span>
                {existingFuncties.map(f => (
                  <Badge
                    key={f}
                    variant={compFunctie === f ? "default" : "outline"}
                    className="text-xs cursor-pointer"
                    onClick={() => setCompFunctie(f)}
                  >
                    {f}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {compFunctie && (
          <>
            {manageCompetencies && manageCompetencies.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">{manageCompetencies.length} competentie(s) voor "{compFunctie}" (max 6)</p>
                {manageCompetencies.map((comp, i) => (
                  <Card key={comp.id} className="border border-border/60" data-testid={`comp-card-${comp.id}`}>
                    <CardContent className="p-4 space-y-3">
                      {editingCompId === comp.id ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-muted-foreground w-4">{i + 1}.</span>
                            <Input value={editCompName} onChange={e => setEditCompName(e.target.value)} placeholder="Naam competentie" className="flex-1" data-testid="input-edit-comp-name" />
                          </div>
                          <div className="pl-6 space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">Normering omschrijvingen:</p>
                            {[1, 2, 3, 4, 5].map(n => (
                              <div key={n} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                <div className="flex items-center gap-2 shrink-0 sm:w-64">
                                  <Badge variant="outline" className="shrink-0 w-6 justify-center text-[10px]">{n}</Badge>
                                  <span className="text-xs text-muted-foreground">{normLabels[n]}</span>
                                </div>
                                <Input
                                  value={(editCompNorms as any)[`norm${n}`]}
                                  onChange={e => setEditCompNorms(prev => ({ ...prev, [`norm${n}`]: e.target.value }))}
                                  placeholder={`Omschrijving voor ${normLabels[n]}`}
                                  className="text-xs h-8"
                                  data-testid={`input-edit-norm-${n}`}
                                />
                              </div>
                            ))}
                          </div>
                          <div className="flex gap-2 pl-6">
                            <Button size="sm" onClick={() => updateCompMutation.mutate({ id: comp.id, data: { name: editCompName, ...editCompNorms } })} data-testid="button-save-edit-comp">
                              <Save className="h-4 w-4 mr-1" />
                              Bewaren
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingCompId(null)}>Annuleren</Button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">{i + 1}. {comp.name}</p>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" onClick={() => {
                                setEditingCompId(comp.id);
                                setEditCompName(comp.name);
                                setEditCompNorms({ norm1: comp.norm1 || "", norm2: comp.norm2 || "", norm3: comp.norm3 || "", norm4: comp.norm4 || "", norm5: comp.norm5 || "" });
                              }} data-testid={`button-edit-comp-${comp.id}`}>
                                <Settings className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => deleteCompMutation.mutate(comp.id)} data-testid={`button-delete-comp-${comp.id}`}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          {(comp.norm1 || comp.norm2 || comp.norm3 || comp.norm4 || comp.norm5) && (
                            <div className="mt-2 pl-4 space-y-1">
                              {[1, 2, 3, 4, 5].map(n => {
                                const normVal = (comp as any)[`norm${n}`];
                                return normVal ? (
                                  <div key={n} className="flex items-start gap-2 text-xs text-muted-foreground">
                                    <Badge variant="outline" className="shrink-0 w-6 justify-center text-[10px] mt-0.5">{n}</Badge>
                                    <span className="shrink-0 font-medium min-w-[12rem]">{normLabels[n]}</span>
                                    <span>{normVal}</span>
                                  </div>
                                ) : null;
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {(!manageCompetencies || manageCompetencies.length < 6) && (
              <Card className="border border-dashed border-border/60">
                <CardContent className="p-4 space-y-3">
                  <h4 className="text-sm font-medium">Nieuwe competentie toevoegen</h4>
                  <div className="relative">
                    <Input
                      value={newCompName}
                      onChange={e => {
                        setNewCompName(e.target.value);
                        setShowCompDropdown(true);
                      }}
                      onFocus={() => setShowCompDropdown(true)}
                      onBlur={() => setTimeout(() => setShowCompDropdown(false), 200)}
                      placeholder="Naam competentie (bijv. Leiderschap, Communicatie)"
                      data-testid="input-new-comp-name"
                    />
                    {showCompDropdown && (() => {
                      const existingNames = [...new Set(allCompetencies?.map(c => c.name) || [])].sort();
                      const filtered = existingNames.filter(name =>
                        name.toLowerCase().includes(newCompName.toLowerCase()) &&
                        !manageCompetencies?.some(mc => mc.name === name)
                      );
                      if (filtered.length === 0) return null;
                      return (
                        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-md max-h-48 overflow-y-auto" data-testid="comp-name-dropdown">
                          {filtered.map(name => {
                            const usedIn = [...new Set(allCompetencies?.filter(c => c.name === name).map(c => c.functie) || [])];
                            return (
                              <button
                                key={name}
                                type="button"
                                className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground flex items-center justify-between"
                                data-testid={`comp-option-${name}`}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  setNewCompName(name);
                                  setShowCompDropdown(false);
                                  const source = allCompetencies?.find(c => c.name === name);
                                  if (source) {
                                    setNewCompNorms({
                                      norm1: source.norm1 || "",
                                      norm2: source.norm2 || "",
                                      norm3: source.norm3 || "",
                                      norm4: source.norm4 || "",
                                      norm5: source.norm5 || "",
                                    });
                                  }
                                }}
                              >
                                <span>{name}</span>
                                <span className="text-xs text-muted-foreground ml-2">{usedIn.join(", ")}</span>
                              </button>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Normering omschrijvingen (optioneel):</p>
                    {[1, 2, 3, 4, 5].map(n => (
                      <div key={n} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                        <div className="flex items-center gap-2 shrink-0 sm:w-64">
                          <Badge variant="outline" className="shrink-0 w-6 justify-center text-[10px]">{n}</Badge>
                          <span className="text-xs text-muted-foreground">{normLabels[n]}</span>
                        </div>
                        <Input
                          value={(newCompNorms as any)[`norm${n}`]}
                          onChange={e => setNewCompNorms(prev => ({ ...prev, [`norm${n}`]: e.target.value }))}
                          placeholder={`Omschrijving voor ${normLabels[n]}`}
                          className="text-xs h-8"
                          data-testid={`input-new-norm-${n}`}
                        />
                      </div>
                    ))}
                  </div>
                  <Button size="sm" onClick={() => {
                    if (!newCompName.trim()) {
                      toast({ title: "Vul een naam in", variant: "destructive" });
                      return;
                    }
                    createCompMutation.mutate({
                      functie: compFunctie,
                      name: newCompName.trim(),
                      ...newCompNorms,
                      sortOrder: manageCompetencies?.length || 0,
                    });
                  }} disabled={createCompMutation.isPending} data-testid="button-add-comp">
                    <Save className="h-4 w-4 mr-1" />
                    Bewaren
                  </Button>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    );
  }

  if (viewMode === "overview") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between print:hidden">
          <div className="flex items-center gap-3">
            {isAdmin && (
              <>
                <Button variant="outline" size="icon" onClick={() => setSelectedYear(y => y - 1)} data-testid="button-beoor-year-prev">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-lg font-semibold min-w-[60px] text-center" data-testid="text-beoor-selected-year">{selectedYear}</span>
                <Button variant="outline" size="icon" onClick={() => setSelectedYear(y => y + 1)} data-testid="button-beoor-year-next">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setViewMode("competencies")} data-testid="button-manage-competencies">
                <Settings className="h-4 w-4 mr-2" />
                Competenties
              </Button>
              <Button onClick={handleNewForm} data-testid="button-new-beoordeling">
                <Plus className="h-4 w-4 mr-2" />
                Nieuwe Beoordeling
              </Button>
            </div>
          )}
        </div>

        {loadingReviews ? (
          <div className="space-y-3">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        ) : !reviewsToShow || reviewsToShow.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center py-10">
              <UserCheck className="h-10 w-10 text-muted-foreground mb-3" />
              <p className="text-muted-foreground text-sm">
                {isAdmin
                  ? `Geen beoordelingen gevonden voor ${selectedYear}`
                  : "U heeft nog geen beoordelingen ontvangen"}
              </p>
              {isAdmin && (
                <Button variant="link" onClick={handleNewForm} className="mt-2">
                  Nieuwe beoordeling aanmaken
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {reviewsToShow.map((review) => (
              <Card key={review.id} className="border border-border/60" data-testid={`beoor-card-${review.id}`}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                      <UserCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{review.medewerker}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{review.functie}</span>
                        {review.afdeling && <span>- {review.afdeling}</span>}
                        <span>- {format(new Date(review.datum), "d MMM yyyy", { locale: nl })}</span>
                        {review.totalScore && <Badge variant="secondary" className="text-[10px]">{review.totalScore}</Badge>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleViewReview(review)} data-testid={`button-view-beoor-${review.id}`}>
                      <Eye className="h-4 w-4 mr-1" />
                      Bekijken
                    </Button>
                    {isAdmin && (
                      <Button variant="outline" size="sm" onClick={() => deleteMutation.mutate(review.id)} data-testid={`button-delete-beoor-${review.id}`}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  const compList = functieCompetencies || [];
  const isReadOnly = !isAdmin;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleBackToOverview} data-testid="button-back-overview-beoor">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Overzicht
          </Button>
          <p className="text-sm text-muted-foreground">
            {viewingReview ? "Bekijk of bewerk de beoordeling" : "Vul de beoordeling in"}
          </p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <Button onClick={handleSave} disabled={saveMutation.isPending} data-testid="button-save-beoordeling">
              <Save className="h-4 w-4 mr-2" />
              {saveMutation.isPending ? "Opslaan..." : "Opslaan"}
            </Button>
            <Button onClick={() => window.print()} variant="outline" data-testid="button-print-beoordeling">
              <Printer className="h-4 w-4 mr-2" />
              Afdrukken
            </Button>
          </div>
        )}
      </div>

      <div id="beoordeling-form" className="space-y-6 print:hidden">
        <Card className="border border-border/60 print:border print:shadow-none print:bg-white">
          <CardContent className="p-6 print:p-4">
            <h2 className="text-lg font-bold text-center mb-1 print:text-xl" data-testid="text-beoordeling-title">
              BEOORDELINGSFORMULIER
            </h2>
            <p className="text-xs text-muted-foreground text-center mb-6 print:text-sm print:text-black">
              Vertrouwelijk
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print:gap-2">
              {isAdmin ? (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground print:text-black">Medewerker</label>
                  <Select onValueChange={handleSelectEmployee} value={selectedUserId} disabled={isReadOnly}>
                    <SelectTrigger data-testid="select-beoor-employee">
                      <SelectValue placeholder="Kies een medewerker..." />
                    </SelectTrigger>
                    <SelectContent>
                      {users?.filter(u => u.active).map(u => (
                        <SelectItem key={u.id} value={u.id}>{u.fullName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground print:text-black">Medewerker</label>
                  <Input value={viewingReview?.medewerker || currentUser?.fullName || ""} readOnly className="print:border-0 print:border-b print:rounded-none print:px-0 print:shadow-none" />
                </div>
              )}
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground print:text-black">Functie</label>
                {isAdmin ? (
                  <Select onValueChange={val => setSelectedFunctie(val)} value={selectedFunctie}>
                    <SelectTrigger className="print:border-0 print:border-b print:rounded-none print:px-0 print:shadow-none" data-testid="select-beoor-functie">
                      <SelectValue placeholder="Selecteer functie..." />
                    </SelectTrigger>
                    <SelectContent>
                      {existingFuncties.map(f => (
                        <SelectItem key={f} value={f}>{f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value={viewingReview?.functie || ""} readOnly className="print:border-0 print:border-b print:rounded-none print:px-0 print:shadow-none" />
                )}
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground print:text-black">Beoordelaar</label>
                <div className="flex gap-2">
                  <Input
                    value={formData.beoordelaar}
                    onChange={e => setFormData(prev => ({ ...prev, beoordelaar: e.target.value }))}
                    placeholder="Naam beoordelaar"
                    readOnly={isReadOnly}
                    className="print:border-0 print:border-b print:rounded-none print:px-0 print:shadow-none"
                    data-testid="input-beoor-beoordelaar"
                  />
                  {isAdmin && (
                    <Select onValueChange={val => { const mgr = users?.find(u => u.id === val); if (mgr) setFormData(prev => ({ ...prev, beoordelaar: mgr.fullName })); }}>
                      <SelectTrigger className="w-[140px] print:hidden" data-testid="select-beoor-beoordelaar">
                        <SelectValue placeholder="Kies..." />
                      </SelectTrigger>
                      <SelectContent>
                        {users?.filter(u => u.active && (u.role === "manager" || isAdminRole(u.role))).map(u => (
                          <SelectItem key={u.id} value={u.id}>{u.fullName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground print:text-black">Datum beoordeling</label>
                <Input
                  type="date"
                  value={formData.datum}
                  onChange={e => setFormData(prev => ({ ...prev, datum: e.target.value }))}
                  readOnly={isReadOnly}
                  className="print:border-0 print:border-b print:rounded-none print:px-0 print:shadow-none"
                  data-testid="input-beoor-datum"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground print:text-black">Beoordelingsperiode</label>
                  <Input
                    value={formData.periode}
                    onChange={e => setFormData(prev => ({ ...prev, periode: e.target.value }))}
                    placeholder="bijv. jan 2025 - dec 2025"
                    readOnly={isReadOnly}
                    className="print:border-0 print:border-b print:rounded-none print:px-0 print:shadow-none"
                    data-testid="input-beoor-periode"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground print:text-black">Beoordelingsjaar</label>
                  <Input
                    type="number"
                    value={formData.beoordelingsJaar}
                    onChange={e => setFormData(prev => ({ ...prev, beoordelingsJaar: parseInt(e.target.value) || new Date().getFullYear() }))}
                    readOnly={isReadOnly}
                    className="print:border-0 print:border-b print:rounded-none print:px-0 print:shadow-none"
                    data-testid="input-beoor-jaar"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {(selectedFunctie || viewingReview) && (
          <Card className="border border-border/60 print:border print:shadow-none print:bg-white">
            <CardContent className="p-6 print:p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm border-b pb-2 print:text-base flex-1">Competentiebeoordeling — {selectedFunctie || viewingReview?.functie}</h3>
              </div>
              {compList.length === 0 && !viewingReview ? (
                <div className="text-center py-6">
                  <p className="text-sm text-muted-foreground">Geen competenties gevonden voor functie "{selectedFunctie}".</p>
                  {isAdmin && (
                    <Button variant="link" onClick={() => {
                      setCompFunctie(selectedFunctie);
                      setViewMode("competencies");
                    }} className="mt-1">
                      Competenties instellen voor deze functie
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground w-8">#</th>
                          <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Competentie</th>
                          <th className="text-center py-2 px-3 text-xs font-medium text-muted-foreground w-[180px]">Score (1-5)</th>
                          <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Toelichting</th>
                        </tr>
                      </thead>
                      <tbody>
                        {compList.map((comp, i) => {
                          const currentScore = formScores[comp.id]?.score || null;
                          const currentToelichting = formScores[comp.id]?.toelichting || "";
                          const hasNorms = comp.norm1 || comp.norm2 || comp.norm3 || comp.norm4 || comp.norm5;
                          return (
                            <tr key={comp.id} className="border-b last:border-0" data-testid={`beoor-comp-${comp.id}`}>
                              <td className="py-3 px-3 text-muted-foreground align-top">{i + 1}</td>
                              <td className="py-3 px-3 align-top">
                                <p className="font-medium">{comp.name}</p>
                                {isAdmin && hasNorms && currentScore && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {(comp as any)[`norm${currentScore}`]}
                                  </p>
                                )}
                              </td>
                              <td className="py-3 px-3 align-top">
                                <div className="flex items-center justify-center gap-1">
                                  {[1, 2, 3, 4, 5].map(n => {
                                    const normText = (comp as any)[`norm${n}`];
                                    return (
                                      <button
                                        key={n}
                                        type="button"
                                        disabled={isReadOnly}
                                        title={normText || `Score ${n}`}
                                        onClick={() => {
                                          if (!isReadOnly) setFormScores(prev => ({
                                            ...prev,
                                            [comp.id]: { score: n, toelichting: prev[comp.id]?.toelichting || "" }
                                          }));
                                        }}
                                        className={`w-8 h-8 rounded-full text-xs font-bold transition-colors ${
                                          currentScore === n
                                            ? "bg-primary text-primary-foreground"
                                            : "bg-muted text-muted-foreground hover:bg-primary/20"
                                        } ${isReadOnly ? "cursor-default" : "cursor-pointer"}`}
                                        data-testid={`button-score-${comp.id}-${n}`}
                                      >
                                        {n}
                                      </button>
                                    );
                                  })}
                                </div>
                              </td>
                              <td className="py-3 px-3 align-top">
                                {isAdmin ? (
                                  <Input
                                    value={currentToelichting}
                                    onChange={e => setFormScores(prev => ({
                                      ...prev,
                                      [comp.id]: { score: prev[comp.id]?.score || null, toelichting: e.target.value }
                                    }))}
                                    placeholder="Optioneel"
                                    className="text-xs h-8"
                                    data-testid={`input-beoor-toelichting-${comp.id}`}
                                  />
                                ) : (
                                  <span className="text-xs text-muted-foreground">{currentToelichting || "—"}</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center justify-end gap-6 pt-2 border-t">
                    <div className="flex items-center gap-2" data-testid="text-beoor-total">
                      <span className="text-sm font-medium text-muted-foreground">Totaal:</span>
                      <span className="text-lg font-bold">{totalScore}</span>
                      <span className="text-sm text-muted-foreground">/ {compList.length * 5}</span>
                    </div>
                    <div className="flex items-center gap-2" data-testid="text-beoor-average">
                      <span className="text-sm font-medium text-muted-foreground">Gemiddelde:</span>
                      <Badge variant={averageScore >= 4 ? "default" : averageScore >= 3 ? "secondary" : "destructive"} className="text-sm px-3 py-1">
                        {scoreValues.length > 0 ? averageScore.toFixed(1) : "—"}
                      </Badge>
                      {scoreValues.length > 0 && (
                        <span className="text-xs text-muted-foreground">({scoreLabels[Math.round(averageScore)] || ""})</span>
                      )}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="border border-border/60 print:border print:shadow-none print:break-inside-avoid">
          <CardContent className="p-6 print:p-4 space-y-4 print:space-y-2">
            <h3 className="font-semibold text-sm border-b pb-2 print:text-base">Afspraken en opmerkingen</h3>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground print:text-black">Gemaakte afspraken</label>
              <Textarea
                value={formData.afspraken}
                onChange={e => setFormData(prev => ({ ...prev, afspraken: e.target.value }))}
                rows={3}
                readOnly={isReadOnly}
                placeholder="Welke afspraken zijn er gemaakt?"
                className="print:border-0 print:border-b print:rounded-none print:px-0 print:shadow-none print:resize-none"
                data-testid="input-beoor-afspraken"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground print:text-black">Opmerkingen medewerker</label>
              <Textarea
                value={formData.opmerkingMedewerker}
                onChange={e => setFormData(prev => ({ ...prev, opmerkingMedewerker: e.target.value }))}
                rows={2}
                readOnly={isReadOnly}
                className="print:border-0 print:border-b print:rounded-none print:px-0 print:shadow-none print:resize-none"
                data-testid="input-beoor-opmerking-medewerker"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground print:text-black">Opmerkingen beoordelaar</label>
              <Textarea
                value={formData.opmerkingBeoordelaar}
                onChange={e => setFormData(prev => ({ ...prev, opmerkingBeoordelaar: e.target.value }))}
                rows={2}
                readOnly={isReadOnly}
                className="print:border-0 print:border-b print:rounded-none print:px-0 print:shadow-none print:resize-none"
                data-testid="input-beoor-opmerking-beoordelaar"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/60 print:border print:shadow-none print:break-inside-avoid">
          <CardContent className="p-6 print:p-4 space-y-6 print:space-y-4">
            <h3 className="font-semibold text-sm border-b pb-2 print:text-base">Ondertekening</h3>
            <p className="text-xs text-muted-foreground print:text-black">
              Beide partijen verklaren dat deze beoordeling heeft plaatsgevonden en dat de inhoud van dit formulier een correcte weergave is van het besprokene.
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
                  <p className="text-xs font-medium text-muted-foreground print:text-black mb-1">Handtekening beoordelaar</p>
                  <div className="border-b border-dashed h-12 print:h-16"></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="hidden print:block print:space-y-4">
        <Card className="border print:shadow-none print:bg-white">
          <CardContent className="p-4">
            <h2 className="text-xl font-bold text-center mb-1">BEOORDELINGSFORMULIER</h2>
            <p className="text-sm text-center mb-4">Vertrouwelijk</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs font-medium">Medewerker</label>
                <p className="text-sm border-b border-gray-400 pb-1">{viewingReview?.medewerker || users?.find(u => u.id === selectedUserId)?.fullName || "-"}</p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Functie</label>
                <p className="text-sm border-b border-gray-400 pb-1">{selectedFunctie || viewingReview?.functie || "-"}</p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Afdeling</label>
                <p className="text-sm border-b border-gray-400 pb-1">{viewingReview?.afdeling || users?.find(u => u.id === selectedUserId)?.department || "-"}</p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Beoordelaar</label>
                <p className="text-sm border-b border-gray-400 pb-1">{formData.beoordelaar || "-"}</p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Datum</label>
                <p className="text-sm border-b border-gray-400 pb-1">{formData.datum ? format(new Date(formData.datum), "d MMMM yyyy", { locale: nl }) : "-"}</p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Beoordelingsperiode</label>
                <p className="text-sm border-b border-gray-400 pb-1">{formData.periode || "-"}</p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Beoordelingsjaar</label>
                <p className="text-sm border-b border-gray-400 pb-1">{formData.beoordelingsJaar}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {compList.length > 0 && (
          <Card className="border print:shadow-none print:bg-white">
            <CardContent className="p-4 space-y-3">
              <h3 className="font-semibold text-base border-b pb-2">Competentiebeoordeling — {selectedFunctie || viewingReview?.functie}</h3>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2 text-xs font-medium w-8">#</th>
                    <th className="text-left py-2 px-2 text-xs font-medium">Competentie</th>
                    <th className="text-center py-2 px-2 text-xs font-medium w-20">Score</th>
                    <th className="text-left py-2 px-2 text-xs font-medium">Toelichting</th>
                  </tr>
                </thead>
                <tbody>
                  {compList.map((comp, i) => {
                    const s = formScores[comp.id]?.score;
                    const t = formScores[comp.id]?.toelichting || "";
                    const normText = s ? (comp as any)[`norm${s}`] : "";
                    return (
                      <tr key={comp.id} className="border-b last:border-0">
                        <td className="py-2 px-2 align-top">{i + 1}</td>
                        <td className="py-2 px-2 align-top">
                          <p className="font-medium">{comp.name}</p>
                          {normText && <p className="text-xs mt-0.5 text-gray-600">{normText}</p>}
                        </td>
                        <td className="py-2 px-2 align-top text-center font-bold">{s || "-"}</td>
                        <td className="py-2 px-2 align-top text-xs">{t || "-"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="flex items-center justify-end gap-6 pt-2 border-t text-sm">
                <span>Totaal: <strong>{totalScore}</strong> / {compList.length * 5}</span>
                <span>Gemiddelde: <strong>{scoreValues.length > 0 ? averageScore.toFixed(1) : "—"}</strong>
                  {scoreValues.length > 0 && ` (${scoreLabels[Math.round(averageScore)] || ""})`}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="border print:shadow-none print:bg-white print:break-inside-avoid">
          <CardContent className="p-4 space-y-2">
            <h3 className="font-semibold text-base border-b pb-2">Afspraken en opmerkingen</h3>
            <div className="space-y-1">
              <label className="text-xs font-medium">Gemaakte afspraken</label>
              <p className="text-sm whitespace-pre-wrap">{formData.afspraken || "-"}</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Opmerkingen medewerker</label>
              <p className="text-sm whitespace-pre-wrap">{formData.opmerkingMedewerker || "-"}</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Opmerkingen beoordelaar</label>
              <p className="text-sm whitespace-pre-wrap">{formData.opmerkingBeoordelaar || "-"}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border print:shadow-none print:bg-white print:break-inside-avoid">
          <CardContent className="p-4 space-y-4">
            <h3 className="font-semibold text-base border-b pb-2">Ondertekening</h3>
            <p className="text-xs">
              Beide partijen verklaren dat deze beoordeling heeft plaatsgevonden en dat de inhoud van dit formulier een correcte weergave is van het besprokene.
            </p>
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-12">
                <div>
                  <p className="text-xs font-medium mb-1">Datum</p>
                  <div className="border-b border-dashed h-8"></div>
                </div>
                <div>
                  <p className="text-xs font-medium mb-1">Handtekening medewerker</p>
                  <div className="border-b border-dashed h-16"></div>
                </div>
              </div>
              <div className="space-y-12">
                <div>
                  <p className="text-xs font-medium mb-1">Datum</p>
                  <div className="border-b border-dashed h-8"></div>
                </div>
                <div>
                  <p className="text-xs font-medium mb-1">Handtekening beoordelaar</p>
                  <div className="border-b border-dashed h-16"></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {isAdmin && (
        <div className="flex justify-end gap-2 print:hidden">
          <Button onClick={handleSave} disabled={saveMutation.isPending} data-testid="button-save-beoordeling-bottom">
            <Save className="h-4 w-4 mr-2" />
            {saveMutation.isPending ? "Opslaan..." : "Opslaan"}
          </Button>
          <Button onClick={() => window.print()} variant="outline" data-testid="button-print-beoordeling-bottom">
            <Printer className="h-4 w-4 mr-2" />
            Afdrukken
          </Button>
        </div>
      )}
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
      <div className="flex items-center justify-between gap-4 flex-wrap print:hidden">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-beloningen-title">Beloningen</h1>
          <p className="text-muted-foreground text-sm">Functionering, beoordeling en beloning</p>
        </div>
        {activeTab === "beloningsysteem" && isAdminRole(user?.role) && (
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

      <div className="flex gap-1 border-b print:hidden">
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
        {isAdminRole(user?.role) && (
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
            Beloning
          </button>
        )}
      </div>

      {activeTab === "functionering" && (
        <FunctioneringForm users={users} currentUser={user} />
      )}

      {activeTab === "beoordeling" && (
        <BeoordelingSection users={users} currentUser={user} />
      )}

      {activeTab === "beloningsysteem" && isAdminRole(user?.role) && (
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
