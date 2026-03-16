import { useQuery } from "@tanstack/react-query";
import { Printer, Users, Cake, Award, ActivitySquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHero } from "@/components/page-hero";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import type { User } from "@shared/schema";

type UserExt = User & {
  kadasterId?: string | null;
  cedulaNr?: string | null;
  telefoonnr?: string | null;
  mobielnr?: string | null;
  adres?: string | null;
};

const roleLabels: Record<string, string> = {
  directeur: "Directeur",
  admin: "Beheerder",
  manager: "Manager",
  manager_az: "Manager AZ",
  employee: "Medewerker",
};

function formatDateDutch(dateStr: string | null | undefined) {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("nl-NL", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function birthdaySort(a: UserExt, b: UserExt) {
  if (!a.birthDate && !b.birthDate) return 0;
  if (!a.birthDate) return 1;
  if (!b.birthDate) return -1;
  const [, am, ad] = a.birthDate.split("-");
  const [, bm, bd] = b.birthDate.split("-");
  return am !== bm ? parseInt(am) - parseInt(bm) : parseInt(ad) - parseInt(bd);
}

function yearsOfService(startDate: string | null | undefined) {
  if (!startDate) return null;
  const start = new Date(startDate + "T00:00:00");
  const now = new Date();
  let years = now.getFullYear() - start.getFullYear();
  const m = now.getMonth() - start.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < start.getDate())) years--;
  return years;
}

function PrintButton({ label }: { label: string }) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => window.print()}
      className="print:hidden"
      data-testid="button-print"
    >
      <Printer className="h-4 w-4 mr-2" />
      {label}
    </Button>
  );
}

function MedewerkerInfoTab({ users }: { users: UserExt[] }) {
  const active = users.filter(u => u.active);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <p className="text-sm text-muted-foreground">
          Overzicht van medewerkergegevens — {active.length} actieve medewerkers
        </p>
        <PrintButton label="Afdrukken" />
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kadaster ID</TableHead>
              <TableHead>Naam</TableHead>
              <TableHead>Cedulanr.</TableHead>
              <TableHead>Telefoonnr.</TableHead>
              <TableHead>Mobielnr.</TableHead>
              <TableHead>Adres</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {active.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Geen medewerkers gevonden
                </TableCell>
              </TableRow>
            ) : (
              active
                .sort((a, b) => (a.fullName || "").localeCompare(b.fullName || "", "nl"))
                .map(u => (
                  <TableRow key={u.id} data-testid={`row-medewerker-info-${u.id}`}>
                    <TableCell className="text-sm font-mono">{u.kadasterId || "—"}</TableCell>
                    <TableCell className="font-medium">{u.fullName}</TableCell>
                    <TableCell className="text-sm">{u.cedulaNr || "—"}</TableCell>
                    <TableCell className="text-sm">{u.telefoonnr || "—"}</TableCell>
                    <TableCell className="text-sm">{u.mobielnr || "—"}</TableCell>
                    <TableCell className="text-sm">{u.adres || "—"}</TableCell>
                  </TableRow>
                ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function VerjaardagenTab({ users }: { users: UserExt[] }) {
  const withBirthday = users.filter(u => u.active && u.birthDate).sort(birthdaySort);
  const today = new Date();
  const todayMonth = today.getMonth() + 1;
  const todayDay = today.getDate();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <p className="text-sm text-muted-foreground">
          Verjaardagen van actieve medewerkers — gesorteerd op maand/dag
        </p>
        <PrintButton label="Afdrukken" />
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Naam</TableHead>
              <TableHead>Afdeling</TableHead>
              <TableHead>Geboortedatum</TableHead>
              <TableHead>Leeftijd</TableHead>
              <TableHead className="print:hidden">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {withBirthday.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Geen geboortedatums ingevoerd
                </TableCell>
              </TableRow>
            ) : (
              withBirthday.map(u => {
                const [, bm, bd] = u.birthDate!.split("-");
                const isToday = parseInt(bm) === todayMonth && parseInt(bd) === todayDay;
                const age = new Date().getFullYear() - parseInt(u.birthDate!.split("-")[0]);
                return (
                  <TableRow key={u.id} data-testid={`row-verjaardag-${u.id}`} className={isToday ? "bg-yellow-50 dark:bg-yellow-950/30" : ""}>
                    <TableCell className="font-medium">
                      {u.fullName}
                      {isToday && <span className="ml-2 text-yellow-600">🎂</span>}
                    </TableCell>
                    <TableCell className="text-sm">{u.department || "—"}</TableCell>
                    <TableCell className="text-sm">{formatDateDutch(u.birthDate)}</TableCell>
                    <TableCell className="text-sm">{age} jaar</TableCell>
                    <TableCell className="print:hidden">
                      {isToday && <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">Vandaag!</Badge>}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function JubileaTab({ users }: { users: UserExt[] }) {
  const withStart = users.filter(u => u.active && u.startDate);
  const sorted = withStart.sort((a, b) => {
    const yA = yearsOfService(a.startDate) ?? 0;
    const yB = yearsOfService(b.startDate) ?? 0;
    return yB - yA;
  });

  const milestones = [5, 10, 15, 20, 25, 30];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <p className="text-sm text-muted-foreground">
          Dienstjaren van actieve medewerkers — gesorteerd op hoogste aantal jaren
        </p>
        <PrintButton label="Afdrukken" />
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Naam</TableHead>
              <TableHead>Afdeling</TableHead>
              <TableHead>Datum in Dienst</TableHead>
              <TableHead>Dienstjaren</TableHead>
              <TableHead className="print:hidden">Jubileum</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Geen startdatums ingevoerd
                </TableCell>
              </TableRow>
            ) : (
              sorted.map(u => {
                const years = yearsOfService(u.startDate) ?? 0;
                const nextMilestone = milestones.find(m => m > years);
                const isMilestone = milestones.includes(years);
                return (
                  <TableRow key={u.id} data-testid={`row-jubileum-${u.id}`} className={isMilestone ? "bg-amber-50 dark:bg-amber-950/30" : ""}>
                    <TableCell className="font-medium">
                      {u.fullName}
                      {isMilestone && <span className="ml-2 text-amber-600">🏆</span>}
                    </TableCell>
                    <TableCell className="text-sm">{u.department || "—"}</TableCell>
                    <TableCell className="text-sm">{formatDateDutch(u.startDate)}</TableCell>
                    <TableCell className="text-sm font-semibold">{years} jaar</TableCell>
                    <TableCell className="print:hidden text-sm text-muted-foreground">
                      {isMilestone
                        ? <Badge className="bg-amber-100 text-amber-800 border-amber-300">{years}-jarig jubileum!</Badge>
                        : nextMilestone
                        ? `${nextMilestone - years} jaar tot ${nextMilestone} jaar`
                        : "—"}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function MedewerkerStatusTab({ users }: { users: UserExt[] }) {
  const sorted = [...users].sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1;
    return (a.fullName || "").localeCompare(b.fullName || "", "nl");
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between print:hidden">
        <p className="text-sm text-muted-foreground">
          Status overzicht van alle medewerkers — actief en inactief
        </p>
        <PrintButton label="Afdrukken" />
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Naam</TableHead>
              <TableHead>Afdeling</TableHead>
              <TableHead>Functie</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Datum in Dienst</TableHead>
              <TableHead>Datum uit Dienst</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Geen medewerkers gevonden
                </TableCell>
              </TableRow>
            ) : (
              sorted.map(u => (
                <TableRow key={u.id} data-testid={`row-status-${u.id}`}>
                  <TableCell className="font-medium">{u.fullName}</TableCell>
                  <TableCell className="text-sm">{u.department || "—"}</TableCell>
                  <TableCell className="text-sm">{u.functie || "—"}</TableCell>
                  <TableCell className="text-sm">{roleLabels[u.role] || u.role}</TableCell>
                  <TableCell className="text-sm">{formatDateDutch(u.startDate)}</TableCell>
                  <TableCell className="text-sm">{u.endDate ? formatDateDutch(u.endDate) : "—"}</TableCell>
                  <TableCell>
                    <Badge variant={u.active ? "default" : "secondary"} data-testid={`badge-status-${u.id}`}>
                      {u.active ? "Actief" : "Inactief"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default function RapportenPage() {
  const { data: users, isLoading } = useQuery<UserExt[]>({ queryKey: ["/api/users"] });

  return (
    <div className="overflow-auto h-full">
      <PageHero
        title="Rapporten"
        subtitle="Overzichten en afdrukbare rapporten van medewerkergegevens"
        imageSrc="/uploads/App_pics/rapporten.png"
        imageAlt="rapporten"
      />
      <div className="p-6">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-64" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : (
          <Tabs defaultValue="medewerker-info">
            <TabsList className="mb-6 print:hidden">
              <TabsTrigger value="medewerker-info" data-testid="tab-medewerker-info">
                <Users className="h-4 w-4 mr-2" />
                Medewerker info
              </TabsTrigger>
              <TabsTrigger value="verjaardagen" data-testid="tab-verjaardagen">
                <Cake className="h-4 w-4 mr-2" />
                Verjaardagen
              </TabsTrigger>
              <TabsTrigger value="jubilea" data-testid="tab-jubilea">
                <Award className="h-4 w-4 mr-2" />
                Jubilea
              </TabsTrigger>
              <TabsTrigger value="medewerker-status" data-testid="tab-medewerker-status">
                <ActivitySquare className="h-4 w-4 mr-2" />
                Medewerker status
              </TabsTrigger>
            </TabsList>
            <TabsContent value="medewerker-info">
              <MedewerkerInfoTab users={users || []} />
            </TabsContent>
            <TabsContent value="verjaardagen">
              <VerjaardagenTab users={users || []} />
            </TabsContent>
            <TabsContent value="jubilea">
              <JubileaTab users={users || []} />
            </TabsContent>
            <TabsContent value="medewerker-status">
              <MedewerkerStatusTab users={users || []} />
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}
