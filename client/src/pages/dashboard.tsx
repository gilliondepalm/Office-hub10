import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CalendarDays,
  Megaphone,
  Users,
  Clock,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import type { Event, Announcement, Absence } from "@shared/schema";
import { useAuth } from "@/lib/auth";

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  color,
}: {
  title: string;
  value: string | number;
  icon: any;
  description?: string;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold" data-testid={`stat-${title.toLowerCase().replace(/\s/g, "-")}`}>{value}</p>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${color}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const { data: stats, isLoading } = useQuery<{
    totalEmployees: number;
    activeAbsences: number;
    upcomingEvents: number;
    totalRewardPoints: number;
    pendingAbsences: number;
  }>({ queryKey: ["/api/dashboard/stats"] });

  const { data: events } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const { data: announcements } = useQuery<Announcement[]>({
    queryKey: ["/api/announcements"],
  });

  const { data: absences } = useQuery<(Absence & { userName?: string })[]>({
    queryKey: [isAdmin ? "/api/absences" : "/api/absences/mine"],
  });

  const upcomingEvents = events
    ?.filter((e) => new Date(e.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5) || [];

  const recentAnnouncements = announcements?.slice(0, 4) || [];
  const pendingAbsences = absences?.filter((a) => a.status === "pending").slice(0, 5) || [];

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 overflow-auto h-full">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-dashboard-title">Dashboard</h1>
        <p className="text-muted-foreground text-sm">
          Overzicht van uw kantooromgeving
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {isAdmin && (
          <StatCard
            title="Medewerkers"
            value={stats?.totalEmployees || 0}
            icon={Users}
            description="Actieve medewerkers"
            color="bg-primary/10 text-primary"
          />
        )}
        <StatCard
          title="Afwezigheden"
          value={isAdmin ? (stats?.activeAbsences || 0) : (absences?.filter(a => a.status === "approved" || a.status === "pending").length || 0)}
          icon={Clock}
          description={isAdmin ? `${stats?.pendingAbsences || 0} in afwachting` : `${pendingAbsences.length} in afwachting`}
          color="bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
        />
        <StatCard
          title="Evenementen"
          value={stats?.upcomingEvents || 0}
          icon={CalendarDays}
          description="Aankomende evenementen"
          color="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold text-sm">Aankomende Evenementen</h3>
            </div>
            <Badge variant="secondary" className="text-xs">{upcomingEvents.length}</Badge>
          </CardHeader>
          <CardContent className="pt-0">
            {upcomingEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Geen aankomende evenementen</p>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.map((event) => (
                  <div key={event.id} className="flex items-start gap-3 p-2 rounded-md hover-elevate" data-testid={`event-item-${event.id}`}>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary text-xs font-bold">
                      {format(new Date(event.date), "dd", { locale: nl })}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{event.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(event.date), "EEEE d MMMM", { locale: nl })}
                        {event.time && ` - ${event.time}`}
                      </p>
                    </div>
                    {event.category && (
                      <Badge variant="outline" className="shrink-0 text-xs">{event.category}</Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-3">
            <div className="flex items-center gap-2">
              <Megaphone className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold text-sm">Recente Aankondigingen</h3>
            </div>
            <Badge variant="secondary" className="text-xs">{recentAnnouncements.length}</Badge>
          </CardHeader>
          <CardContent className="pt-0">
            {recentAnnouncements.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Geen aankondigingen</p>
            ) : (
              <div className="space-y-3">
                {recentAnnouncements.map((ann) => (
                  <div key={ann.id} className="flex items-start gap-3 p-2 rounded-md hover-elevate" data-testid={`announcement-item-${ann.id}`}>
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${
                      ann.priority === "high"
                        ? "bg-destructive/10 text-destructive"
                        : ann.priority === "medium"
                        ? "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {ann.priority === "high" ? (
                        <AlertCircle className="h-4 w-4" />
                      ) : (
                        <Megaphone className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium truncate">{ann.title}</p>
                        {ann.pinned && <Badge variant="secondary" className="text-xs">Vastgezet</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{ann.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold text-sm">{isAdmin ? "Verzuim in Afwachting" : "Mijn Afwezigheden"}</h3>
            </div>
            <Badge variant="secondary" className="text-xs">{isAdmin ? pendingAbsences.length : (absences?.length || 0)}</Badge>
          </CardHeader>
          <CardContent className="pt-0">
            {(isAdmin ? pendingAbsences : absences || []).length === 0 ? (
              <div className="flex flex-col items-center py-6 text-center">
                <CheckCircle className="h-8 w-8 text-green-500 mb-2" />
                <p className="text-sm text-muted-foreground">{isAdmin ? "Geen openstaande verzuimverzoeken" : "Geen afwezigheden"}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(isAdmin ? pendingAbsences : (absences || []).slice(0, 5)).map((absence) => {
                  const statusColors: Record<string, string> = {
                    pending: "bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400",
                    approved: "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400",
                    rejected: "bg-destructive/10 text-destructive",
                  };
                  const statusLabels: Record<string, string> = {
                    pending: "In afwachting",
                    approved: "Goedgekeurd",
                    rejected: "Afgewezen",
                  };
                  const typeLabels: Record<string, string> = {
                    sick: "Ziekte", vacation: "Vakantie", personal: "Persoonlijk", bvvd: "Bijzonder verlof", other: "Overig",
                  };
                  return (
                  <div key={absence.id} className="flex items-center gap-3 p-2 rounded-md hover-elevate" data-testid={`absence-item-${absence.id}`}>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{isAdmin ? ((absence as any).userName || "Medewerker") : (typeLabels[absence.type] || absence.type)}</p>
                      <p className="text-xs text-muted-foreground">
                        {isAdmin ? (typeLabels[absence.type] || absence.type) + " - " : ""}
                        {format(new Date(absence.startDate), "d MMM", { locale: nl })} t/m {format(new Date(absence.endDate), "d MMM", { locale: nl })}
                      </p>
                    </div>
                    <Badge variant="outline" className={`shrink-0 text-xs ${statusColors[absence.status] || ""}`}>
                      {statusLabels[absence.status] || absence.status}
                    </Badge>
                  </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
