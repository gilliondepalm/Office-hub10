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
import RapportenPage from "@/pages/rapporten";
import BeheerPage from "@/pages/beheer";
import BeloningenPage from "@/pages/beloningen";
import ProfielPage from "@/pages/profiel";

function RollenRechtentabel() {
  const rollen = ["Directeur", "Beheerder", "Beheerder AZ", "Manager", "Medewerker"];
  const JA = <span className="text-green-600 dark:text-green-400 font-bold">✓</span>;
  const JA_AFDELING = <span className="text-amber-600 dark:text-amber-400 font-semibold text-xs">✓ afd.</span>;
  const NEE = <span className="text-muted-foreground/40">—</span>;

  const rows: { label: string; cells: React.ReactNode[] }[] = [
    { label: "Dashboard", cells: [JA, JA, JA, JA, JA] },
    { label: "Kalender bekijken", cells: [JA, JA, JA, JA, JA] },
    { label: "Kalender beheren", cells: [JA, JA, JA, JA, NEE] },
    { label: "Aankondigingen bekijken", cells: [JA, JA, JA, JA, JA] },
    { label: "Aankondigingen aanmaken", cells: [JA, JA, JA, NEE, NEE] },
    { label: "Berichten sturen", cells: [JA, JA, JA, JA, NEE] },
    { label: "Organisatie", cells: [JA, JA, JA, JA, NEE] },
    { label: "Personalia bekijken", cells: [JA, JA, JA, JA, NEE] },
    { label: "Personalia bewerken", cells: [JA, JA, NEE, NEE, NEE] },
    { label: "Verzuim (eigen aanvragen)", cells: [JA, JA, JA, JA, JA] },
    { label: "Verzuim goedkeuren", cells: [JA, JA, JA, JA_AFDELING, NEE] },
    { label: "Vakantiesaldo beheren", cells: [JA, JA, JA, NEE, NEE] },
    { label: "Beloningen bekijken", cells: [JA, JA, JA, JA, JA] },
    { label: "Functionering / Beoordeling / Jaarplan", cells: [JA, JA, JA, JA_AFDELING, NEE] },
    { label: "Beloning (Jaaraward) toekennen", cells: [JA, JA, JA, NEE, NEE] },
    { label: "Applicaties", cells: [JA, JA, JA, JA, JA] },
    { label: "Rapporten", cells: [JA, JA, JA, JA, NEE] },
    { label: "Beheer panel", cells: [JA, JA, NEE, NEE, NEE] },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground leading-relaxed">
        Overzicht van alle rechten per rol. <span className="text-amber-600 dark:text-amber-400 font-semibold">✓ afd.</span> betekent: alleen voor medewerkers van de eigen afdeling.
      </p>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-xs border-collapse min-w-[520px]">
          <thead>
            <tr className="bg-muted/60 border-b border-border">
              <th className="text-left py-2 px-3 font-semibold text-muted-foreground w-[200px]">Module / Functie</th>
              {rollen.map(r => (
                <th key={r} className="text-center py-2 px-2 font-semibold text-muted-foreground whitespace-nowrap">{r}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className={`border-b border-border/50 ${i % 2 === 0 ? "bg-background" : "bg-muted/20"}`}>
                <td className="py-2 px-3 font-medium text-foreground">{row.label}</td>
                {row.cells.map((cell, j) => (
                  <td key={j} className="py-2 px-2 text-center">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground italic">
        Moduletoegang wordt ook bepaald door de toegewezen modules per medewerker in het Beheer panel.
      </p>
    </div>
  );
}

const helpContent: Record<string, { title: string; content: string }> = {
  "/": {
    title: "Dashboard",
    content: `Het Dashboard geeft u een overzicht van de belangrijkste informatie binnen uw organisatie.

\u2022 Bovenaan ziet u statistieken over het aantal medewerkers, afdelingen en openstaande verlofaanvragen.
\u2022 Recente aankondigingen worden getoond zodat u snel op de hoogte bent van het laatste nieuws.
\u2022 De agenda toont aankomende evenementen en belangrijke data.
\u2022 U kunt direct doorklikken naar de verschillende modules via de zijbalk.
\u2022 Een rode badge op een module in de zijbalk betekent dat er nieuwe items zijn sinds uw laatste bezoek.`,
  },
  "/kalender": {
    title: "Kalender",
    content: `De Kalender module biedt een overzicht van alle evenementen, feestdagen en snipperdagen.

\u2022 Bekijk evenementen per maand. Klik op een datum om de details van die dag te bekijken.
\u2022 Gebruik de pijltjes links/rechts om door de maanden te navigeren.
\u2022 Beheerders kunnen evenementen toevoegen, bewerken en verwijderen via de \u201cNieuw Evenement\u201d knop.
\u2022 Categorie\u00ebn: vergadering, training, sociaal en deadline \u2014 elk met een eigen kleur.
\u2022 Offici\u00eble feestdagen (groen) kunnen door beheerders ge\u00fcpload worden via CSV of handmatig worden toegevoegd per jaar.
\u2022 Snipperdagen (rood) zijn verplichte vrije dagen die automatisch worden afgetrokken van ieders vakantiesaldo.
\u2022 Verjaardagen van medewerkers worden automatisch getoond (taart-icoon).
\u2022 Een rode badge in de zijbalk geeft aan dat er nieuwe evenementen of snipperdagen zijn toegevoegd deze maand.`,
  },
  "/aankondigingen": {
    title: "Aankondigingen",
    content: `Aankondigingen is het communicatiecentrum van de organisatie.

\u2022 Bekijk alle aankondigingen gesorteerd op datum. Vastgepinde aankondigingen staan altijd bovenaan.
\u2022 Aankondigingen kunnen de prioriteit \u201cHoog\u201d krijgen (rood label) of geen prioriteit (standaard).
\u2022 Beheerders kunnen aankondigingen maken met een PDF-bijlage en deze vastzetten bovenaan de lijst.
\u2022 Het tabblad \u201cBerichten\u201d bevat directe communicatie: beheerders/managers kunnen berichten sturen naar medewerkers.
\u2022 Medewerkers ontvangen berichten en kunnen daarop reageren.
\u2022 Het tabblad \u201cNieuwsbrief\u201d toont ge\u00fcploade nieuwsbrieven.
\u2022 Een rode badge in de zijbalk geeft aan dat er nieuwe aankondigingen of berichten zijn sinds uw laatste bezoek.`,
  },
  "/organisatie": {
    title: "Organisatie",
    content: `De Organisatie module bevat alle informatie over de structuur van het bedrijf.

\u2022 Afdelingen: Overzicht van alle afdelingen met managers en het aantal medewerkers per afdeling.
\u2022 AO-Procedures: Administratieve procedures per afdeling. Beheerders kunnen procedures aanmaken met stapsgewijze instructies.
\u2022 Organogram: Visueel organisatieschema dat de hi\u00ebrarchie toont met de directeur bovenaan, managers per afdeling en medewerkers daaronder.
\u2022 CAO Info: Informatie over de collectieve arbeidsovereenkomst.
\u2022 Wetgeving: Relevante wet- en regelgeving gegroepeerd per categorie, met directe links naar externe bronnen.`,
  },
  "/personalia": {
    title: "Personalia",
    content: `Personalia is het medewerkersoverzicht van de organisatie.

\u2022 Bekijk alle medewerkers met hun naam, functie, afdeling, e-mail en telefoonnummer.
\u2022 Gebruik de zoekbalk om snel een specifieke medewerker te vinden.
\u2022 Beheerders kunnen nieuwe medewerkers toevoegen en bestaande gegevens bewerken (naam, functie, afdeling, contactgegevens).
\u2022 Medewerkers kunnen actief of inactief worden gezet. Inactieve medewerkers worden niet getoond in het standaard overzicht.
\u2022 Per medewerker is de functiehistorie (loopbaanpad) inzichtelijk.`,
  },
  "/verzuim": {
    title: "Verzuim",
    content: `De Verzuim module beheert alle verlof- en afwezigheidsaanvragen.

Meldingen:
\u2022 Medewerkers dienen verlofaanvragen in (vakantie, ziek, BVVD, persoonlijk). Aanvragen komen terecht bij de beheerder/manager ter goedkeuring.
\u2022 BVVD (Bijzonder Verlof en Vakantie Dagen): verlof met vooraf gedefinieerde redenen zoals huwelijk, overlijden of verhuizing.
\u2022 Beheerders/managers kunnen aanvragen individueel goedkeuren of afwijzen, of meerdere tegelijk selecteren via het selectievakje in de kolom \u201cActie\u201d en dan \u201cAlles Goedkeuren\u201d.

Overzicht:
\u2022 Afwezigheidsrapport: overzicht van alle afwezigheden per afdeling en medewerker, filterbaar op periode.

Vakantiesaldo:
\u2022 Recht: het aantal vakantiedagen waarop een medewerker recht heeft per 1 januari.
\u2022 Saldo Oud: het resterende saldo van het vorige jaar (per 31 december), overgedragen naar het nieuwe jaar.
\u2022 Totaal: Recht + Saldo Oud.
\u2022 Saldo Nieuw: het resterende saldo na aftrek van toegekende, geplande dagen en snipperdagen.
\u2022 Beheerders kunnen via \u201cVakantierecht Instellen\u201d het Recht en Saldo Oud per medewerker instellen.
\u2022 Snipperdagen zijn verplichte vrije dagen die door beheerders worden toegevoegd en automatisch van ieders saldo worden afgetrokken.`,
  },
  "/beloningen": {
    title: "Beloningen",
    content: `De Beloningen module bevat vier onderdelen voor prestatiebeheer.

\u2022 Functionering: Functioneringsgesprekken per medewerker per jaar. Bevat ontwikkelpunten, afspraken en opmerkingen. Filterbaar op jaar.
\u2022 Beoordeling: Beoordelingsgesprekken op basis van competenties per functie. Beheerders configureren competenties met normeringen (score 1\u20135 met beschrijvingen per niveau). Het totaal en gemiddelde worden automatisch berekend.
\u2022 Jaarplan: Jaarlijkse planning per medewerker. Selecteer eerst een afdeling, dan een medewerker. Per afspraak wordt de voortgang bijgehouden met statussen: niet gestart, in uitvoering, op schema, vertraagd, afgerond of geannuleerd.
\u2022 Beloning: Puntensysteem waarmee medewerkers beloond worden. Het leaderboard toont de ranglijst.`,
  },
  "/applicaties": {
    title: "Applicaties",
    content: `De Applicaties module beheert toegang tot externe applicaties en systemen.

\u2022 Bekijk alle beschikbare applicaties met hun beschrijving en directe link.
\u2022 Beheerders kunnen nieuwe applicaties toevoegen, bewerken of verwijderen.
\u2022 Per applicatie kan worden ingesteld welke medewerkers toegang hebben.
\u2022 Klik op een applicatie om deze te openen in een nieuw venster.`,
  },
  "/beheer": {
    title: "Beheer",
    content: `Het Beheer panel is alleen toegankelijk voor administrators (admin/directeur).

\u2022 Gebruikers & Rechten: Beheer de toegangsrechten van elke medewerker. Per medewerker kunt u instellen welke modules zichtbaar zijn in de zijbalk. Gebruik \u201cAlles selecteren\u201d of \u201cAlles wissen\u201d voor snelle aanpassingen.
\u2022 Wachtwoord resetten: Stel een nieuw wachtwoord in voor een medewerker via de \u201cWachtwoord\u201d knop. Het wachtwoord moet minimaal 8 tekens lang zijn.
\u2022 Inlogpagina achtergrond: Upload een nieuwe achtergrondafbeelding voor het inlogscherm.

Rollen:
\u2022 Directeur: volledige toegang tot alle modules en kan alle verlofaanvragen goedkeuren, inclusief die van managers en admins.
\u2022 Admin: toegang tot alle modules, kan verlofaanvragen van medewerkers goedkeuren.
\u2022 Manager: toegang tot de meeste modules (behalve Beheer), kan verlofaanvragen van medewerkers in eigen afdeling goedkeuren.
\u2022 Medewerker: toegang tot Dashboard, Kalender, Aankondigingen, Verzuim en Beloningen.`,
  },
  "/profiel": {
    title: "Mijn Profiel",
    content: `Op de profielpagina vindt u uw persoonlijke gegevens en overzichten.

\u2022 Bekijk uw persoonlijke informatie zoals naam, e-mail, afdeling, functie en startdatum.
\u2022 Overzicht van uw verlofaanvragen met status en vakantiedagen saldo.
\u2022 Bekijk uw beloningspunten en positie op het leaderboard.
\u2022 Overzicht van de modules waartoe u toegang heeft.
\u2022 Uw loopbaanpad (functiehistorie) is hier inzichtelijk.`,
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
      {perms.includes("rapporten") && <Route path="/rapporten" component={RapportenPage} />}
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
        <DialogContent className={`max-h-[85vh] overflow-y-auto ${location === "/beheer" ? "max-w-3xl" : "max-w-lg"}`}>
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
              {location === "/beheer" && (
                <div className="mt-4 pt-4 border-t">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Rechtenoverzicht per rol</h3>
                  <RollenRechtentabel />
                </div>
              )}
              {isAdmin && (
                <div className="flex justify-end pt-2 border-t mt-2">
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
