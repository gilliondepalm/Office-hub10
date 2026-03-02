import { useState } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient, apiRequest } from "./lib/queryClient";
import { QueryClientProvider, useQuery, useMutation } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthProvider, useAuth } from "@/lib/auth";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { HelpCircle, Pencil, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { isAdminRole } from "@shared/schema";
import type { HelpContent } from "@shared/schema";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";
import DashboardPage from "@/pages/dashboard";
import KalenderPage from "@/pages/kalender";
import AankondigingenPage from "@/pages/aankondigingen";
import OrganisatiePage from "@/pages/organisatie";
import PersonaliaPage from "@/pages/personalia";
import VerzuimPage from "@/pages/verzuim";
import ApplicatiesPage from "@/pages/applicaties";
import BeheerPage from "@/pages/beheer";
import BeloningenPage from "@/pages/beloningen";
import ProfielPage from "@/pages/profiel";

const helpContent: Record<string, { title: string; content: string }> = {
  "/": {
    title: "Dashboard",
    content: `Het Dashboard geeft u een overzicht van de belangrijkste informatie binnen uw organisatie.

\u2022 Bovenaan ziet u statistieken over het aantal medewerkers, afdelingen en openstaande verlofaanvragen.
\u2022 Recente aankondigingen worden getoond zodat u snel op de hoogte bent van het laatste nieuws.
\u2022 De agenda toont aankomende evenementen en belangrijke data.
\u2022 U kunt direct doorklikken naar de verschillende modules via de zijbalk.`,
  },
  "/kalender": {
    title: "Kalender",
    content: `De Kalender module biedt een overzicht van alle evenementen en belangrijke data.

\u2022 Bekijk evenementen in maand-, week- of dagweergave.
\u2022 Klik op een datum om de details van die dag te bekijken.
\u2022 Beheerders kunnen nieuwe evenementen toevoegen met de "Nieuw Evenement" knop.
\u2022 Evenementen kunnen een titel, beschrijving, datum en tijdstip bevatten.
\u2022 Gebruik de pijltjes om door de maanden te navigeren.`,
  },
  "/aankondigingen": {
    title: "Aankondigingen",
    content: `Aankondigingen is het communicatiecentrum van de organisatie.

\u2022 Bekijk alle aankondigingen gesorteerd op datum met prioriteitsniveaus (normaal, belangrijk, urgent).
\u2022 Vastgepinde aankondigingen staan altijd bovenaan.
\u2022 Beheerders kunnen nieuwe aankondigingen maken met PDF-bijlagen.
\u2022 Het tabblad "Berichten" bevat directe communicatie tussen beheerder/manager en medewerkers.
\u2022 Medewerkers kunnen reageren op berichten die aan hen gericht zijn.`,
  },
  "/organisatie": {
    title: "Organisatie",
    content: `De Organisatie module bevat alle informatie over de structuur van het bedrijf.

\u2022 Afdelingen: Overzicht van alle afdelingen met managers en medewerkers.
\u2022 AO-Procedures: Administratieve procedures per afdeling met stapsgewijze instructies.
\u2022 Organogram: Visueel organisatieschema dat de hi\u00ebrarchie toont.
\u2022 CAO Info: Informatie over de collectieve arbeidsovereenkomst.
\u2022 Wetgeving: Relevante wet- en regelgeving gegroepeerd per categorie.`,
  },
  "/personalia": {
    title: "Personalia",
    content: `Personalia is het medewerkersoverzicht van de organisatie.

\u2022 Bekijk alle medewerkers met hun naam, functie, afdeling en contactgegevens.
\u2022 Gebruik de zoekfunctie om snel een specifieke medewerker te vinden.
\u2022 Beheerders kunnen nieuwe medewerkers toevoegen en bestaande gegevens bewerken.
\u2022 Per medewerker kunt u details bekijken zoals startdatum, telefoonnummer en e-mail.
\u2022 Medewerkers kunnen actief of inactief worden gezet.`,
  },
  "/verzuim": {
    title: "Verzuim",
    content: `De Verzuim module beheert alle verlof- en afwezigheidsaanvragen.

\u2022 Verlof: Dien vakantiedagen aan en bekijk de status van uw aanvragen (goedgekeurd/afgewezen/in behandeling).
\u2022 BVVD: Bijzonder verlof met vooraf gedefinieerde redenen (huwelijk, overlijden, verhuizing, etc.).
\u2022 Vakantiedagen: Overzicht van uw totale, opgenomen en resterende vakantiedagen.
\u2022 Beheerders kunnen aanvragen goedkeuren of afwijzen en vakantiedagen toewijzen.
\u2022 Het saldo wordt automatisch bijgewerkt bij goedgekeurde aanvragen.`,
  },
  "/beloningen": {
    title: "Beloningen",
    content: `De Beloningen module bevat vier onderdelen voor prestatiebeheer.

\u2022 Functionering: Functioneringsgesprekken per medewerker per jaar. Bevat ontwikkelpunten en afspraken.
\u2022 Beoordeling: Beoordelingsgesprekken op basis van competenties. Per functie worden competenties geconfigureerd met normeringen (score 1-5). Het gemiddelde wordt automatisch berekend.
\u2022 Jaarplan: Jaarlijkse planning per medewerker. Selecteer eerst een afdeling, dan een medewerker. Per plan wordt de voortgang periodiek bijgehouden met statussen (niet gestart, in uitvoering, op schema, vertraagd, afgerond, geannuleerd).
\u2022 Beloning: Beloningssysteem met punten en leaderboard.`,
  },
  "/applicaties": {
    title: "Applicaties",
    content: `De Applicaties module beheert toegang tot externe applicaties.

\u2022 Bekijk alle beschikbare applicaties met hun beschrijving en link.
\u2022 Beheerders kunnen nieuwe applicaties toevoegen en bestaande bewerken.
\u2022 Per applicatie kan worden ingesteld welke medewerkers toegang hebben.
\u2022 Klik op een applicatie om deze te openen in een nieuw venster.`,
  },
  "/beheer": {
    title: "Beheer",
    content: `Het Beheer panel is alleen toegankelijk voor administrators.

\u2022 Gebruikers & Rechten: Beheer de toegangsrechten van elke medewerker per module. Gebruik "Alles selecteren" of "Alles wissen" voor snelle aanpassingen.
\u2022 Wachtwoord resetten: Stel een nieuw wachtwoord in voor een medewerker via de "Wachtwoord" knop.
\u2022 Inlogpagina achtergrond: Upload een nieuwe achtergrondafbeelding voor het inlogscherm.`,
  },
  "/profiel": {
    title: "Mijn Profiel",
    content: `Op de profielpagina vindt u uw persoonlijke gegevens en overzichten.

\u2022 Bekijk uw persoonlijke informatie zoals naam, e-mail, afdeling en functie.
\u2022 Overzicht van uw verlofaanvragen en vakantiedagen saldo.
\u2022 Bekijk uw beloningspunten en beoordelingsgeschiedenis.
\u2022 Overzicht van de modules waartoe u toegang heeft.`,
  },
};

function Router() {
  const { user } = useAuth();
  const perms = user?.permissions || [];

  return (
    <Switch>
      {perms.includes("dashboard") && <Route path="/" component={DashboardPage} />}
      {perms.includes("kalender") && <Route path="/kalender" component={KalenderPage} />}
      {perms.includes("aankondigingen") && <Route path="/aankondigingen" component={AankondigingenPage} />}
      {perms.includes("organisatie") && <Route path="/organisatie" component={OrganisatiePage} />}
      {perms.includes("personalia") && <Route path="/personalia" component={PersonaliaPage} />}
      {perms.includes("verzuim") && <Route path="/verzuim" component={VerzuimPage} />}
      {perms.includes("beloningen") && <Route path="/beloningen" component={BeloningenPage} />}
      {perms.includes("applicaties") && <Route path="/applicaties" component={ApplicatiesPage} />}
      {perms.includes("beheer") && <Route path="/beheer" component={BeheerPage} />}
      <Route path="/profiel" component={ProfielPage} />
      <Route path="/" component={DashboardPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthenticatedApp() {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [location] = useLocation();
  const [helpOpen, setHelpOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState("");

  const { data: dbHelpContent } = useQuery<HelpContent[]>({
    queryKey: ["/api/help-content"],
    enabled: !!user,
  });

  const saveMutation = useMutation({
    mutationFn: async (data: { pageRoute: string; title: string; content: string }) => {
      await apiRequest("PUT", "/api/help-content", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/help-content"] });
      toast({ title: "Help-tekst opgeslagen" });
      setEditing(false);
    },
    onError: () => {
      toast({ title: "Opslaan mislukt", variant: "destructive" });
    },
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="space-y-4 w-64">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  const isAdmin = isAdminRole(user.role);
  const fallback = helpContent[location] || helpContent["/"];
  const dbEntry = dbHelpContent?.find(h => h.pageRoute === location);
  const currentHelp = dbEntry ? { title: dbEntry.title, content: dbEntry.content } : fallback;

  const handleEdit = () => {
    setEditContent(currentHelp.content);
    setEditing(true);
  };

  const handleSave = () => {
    saveMutation.mutate({
      pageRoute: location,
      title: currentHelp.title,
      content: editContent,
    });
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between gap-4 p-3 border-b sticky top-0 z-50 bg-background print-hide">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => { setHelpOpen(true); setEditing(false); }}
                data-testid="button-help"
              >
                <HelpCircle className="h-5 w-5 text-muted-foreground" />
              </Button>
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 overflow-hidden main-content-area">
            <Router />
          </main>
        </div>
      </div>

      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" />
              Help — {currentHelp.title}
            </DialogTitle>
          </DialogHeader>
          {editing ? (
            <div className="space-y-3">
              <Textarea
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                rows={12}
                className="text-sm"
                data-testid="textarea-help-edit"
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setEditing(false)}>Annuleren</Button>
                <Button size="sm" onClick={handleSave} disabled={saveMutation.isPending} data-testid="button-save-help">
                  <Save className="h-4 w-4 mr-1" />
                  {saveMutation.isPending ? "Opslaan..." : "Opslaan"}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed" data-testid="text-help-content">
                {currentHelp.content}
              </div>
              {isAdmin && (
                <div className="flex justify-end pt-2 border-t">
                  <Button variant="outline" size="sm" onClick={handleEdit} data-testid="button-edit-help">
                    <Pencil className="h-4 w-4 mr-1" />
                    Bewerken
                  </Button>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <AuthenticatedApp />
        </AuthProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
