import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User as UserIcon, Mail, Building2, Shield, Clock, Award, CalendarDays, Cake } from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import type { Absence, Reward } from "@shared/schema";
import { useAuth } from "@/lib/auth";

export default function ProfielPage() {
  const { user } = useAuth();

  const { data: myAbsences, isLoading: loadingAbsences } = useQuery<(Absence & { userName?: string })[]>({
    queryKey: ["/api/absences/mine"],
  });

  const { data: myRewards, isLoading: loadingRewards } = useQuery<(Reward & { userName?: string })[]>({
    queryKey: ["/api/rewards/mine"],
  });

  if (!user) return null;

  const initials = user.fullName
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "??";

  const roleLabels: Record<string, string> = {
    admin: "Beheerder",
    manager: "Manager",
    employee: "Medewerker",
  };

  const statusLabels: Record<string, string> = {
    pending: "In afwachting",
    approved: "Goedgekeurd",
    rejected: "Afgewezen",
  };

  const typeLabels: Record<string, string> = {
    sick: "Ziekte",
    vacation: "Vakantie",
    personal: "Persoonlijk",
    other: "Overig",
  };

  const totalPoints = myRewards?.reduce((sum, r) => sum + r.points, 0) || 0;

  return (
    <div className="p-6 space-y-6 overflow-auto h-full">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-profiel-title">Mijn Profiel</h1>
        <p className="text-muted-foreground text-sm">Uw persoonlijke gegevens en overzicht</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-start gap-4 flex-wrap">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-3 min-w-0">
              <div>
                <h2 className="text-xl font-bold" data-testid="text-profile-name">{user.fullName}</h2>
                <Badge variant="secondary" className="mt-1">{roleLabels[user.role] || user.role}</Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm" data-testid="text-profile-email">{user.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm" data-testid="text-profile-dept">{user.department || "Geen afdeling"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <UserIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">@{user.username}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{user.active ? "Actief" : "Inactief"}</span>
                </div>
                {user.birthDate && (
                  <div className="flex items-center gap-2">
                    <Cake className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm" data-testid="text-profile-birthdate">{format(new Date(user.birthDate + "T00:00:00"), "d MMMM yyyy", { locale: nl })}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-3">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm">Mijn Verzuim</h3>
            <Badge variant="secondary" className="ml-auto text-xs">{myAbsences?.length || 0}</Badge>
          </CardHeader>
          <CardContent className="pt-0">
            {loadingAbsences ? (
              <div className="space-y-2">
                {[1, 2].map((i) => <Skeleton key={i} className="h-16" />)}
              </div>
            ) : !myAbsences?.length ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Geen verzuimregistraties</p>
            ) : (
              <div className="space-y-2">
                {myAbsences.map((absence) => (
                  <div key={absence.id} className="flex items-center gap-3 p-2 rounded-md hover-elevate" data-testid={`my-absence-${absence.id}`}>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted">
                      <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{typeLabels[absence.type] || absence.type}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(absence.startDate), "d MMM yyyy", { locale: nl })} t/m {format(new Date(absence.endDate), "d MMM yyyy", { locale: nl })}
                      </p>
                      {absence.reason && <p className="text-xs text-muted-foreground mt-0.5">{absence.reason}</p>}
                    </div>
                    <Badge
                      variant={absence.status === "approved" ? "default" : absence.status === "rejected" ? "destructive" : "outline"}
                      className="text-xs shrink-0"
                    >
                      {statusLabels[absence.status] || absence.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center gap-2 pb-3">
            <Award className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm">Mijn Beloningen</h3>
            <Badge variant="secondary" className="ml-auto text-xs">{totalPoints} punten</Badge>
          </CardHeader>
          <CardContent className="pt-0">
            {loadingRewards ? (
              <div className="space-y-2">
                {[1, 2].map((i) => <Skeleton key={i} className="h-16" />)}
              </div>
            ) : !myRewards?.length ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Nog geen beloningen ontvangen</p>
            ) : (
              <div className="space-y-2">
                {myRewards.map((reward) => (
                  <div key={reward.id} className="flex items-center gap-3 p-2 rounded-md hover-elevate" data-testid={`my-reward-${reward.id}`}>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                      <Award className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{reward.reason}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(reward.awardedAt), "d MMMM yyyy", { locale: nl })}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs shrink-0">+{reward.points}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2 pb-3">
          <Shield className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Mijn Toegang</h3>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex gap-2 flex-wrap">
            {user.permissions?.map((p) => (
              <Badge key={p} variant="outline" className="text-xs capitalize">{p}</Badge>
            )) || <p className="text-sm text-muted-foreground">Geen modules toegewezen</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
