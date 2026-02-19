import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Plus, ChevronLeft, ChevronRight, CalendarDays, MapPin, Clock,
  Trash2, Pencil, Cake, Award, Flag,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addMonths, subMonths, eachDayOfInterval, isSameMonth, isToday,
} from "date-fns";
import { nl } from "date-fns/locale";
import type { Event, User } from "@shared/schema";
import { useAuth } from "@/lib/auth";

const eventFormSchema = z.object({
  title: z.string().min(1, "Titel is verplicht"),
  description: z.string().optional(),
  date: z.string().min(1, "Datum is verplicht"),
  endDate: z.string().optional(),
  time: z.string().optional(),
  location: z.string().optional(),
  category: z.string().optional(),
});

interface CalendarEntry {
  id: string;
  title: string;
  date: string;
  type: "event" | "verjaardag" | "jubileum" | "feestdag";
  category?: string | null;
  description?: string | null;
  time?: string | null;
  location?: string | null;
  event?: Event;
}

function getDutchHolidays(year: number): CalendarEntry[] {
  const easterDate = computeEaster(year);
  const easter = new Date(easterDate);

  const goedeVrijdag = new Date(easter);
  goedeVrijdag.setDate(easter.getDate() - 2);
  const tweedePaasdag = new Date(easter);
  tweedePaasdag.setDate(easter.getDate() + 1);
  const hemelvaartsdag = new Date(easter);
  hemelvaartsdag.setDate(easter.getDate() + 39);
  const eersteePinksterdag = new Date(easter);
  eersteePinksterdag.setDate(easter.getDate() + 49);
  const tweedePinksterdag = new Date(easter);
  tweedePinksterdag.setDate(easter.getDate() + 50);

  const holidays: { name: string; date: Date }[] = [
    { name: "Nieuwjaarsdag", date: new Date(year, 0, 1) },
    { name: "Goede Vrijdag", date: goedeVrijdag },
    { name: "Eerste Paasdag", date: easter },
    { name: "Tweede Paasdag", date: tweedePaasdag },
    { name: "Koningsdag", date: new Date(year, 3, 27) },
    { name: "Bevrijdingsdag", date: new Date(year, 4, 5) },
    { name: "Hemelvaartsdag", date: hemelvaartsdag },
    { name: "Eerste Pinksterdag", date: eersteePinksterdag },
    { name: "Tweede Pinksterdag", date: tweedePinksterdag },
    { name: "Eerste Kerstdag", date: new Date(year, 11, 25) },
    { name: "Tweede Kerstdag", date: new Date(year, 11, 26) },
  ];

  return holidays.map((h) => ({
    id: `feestdag-${h.name}-${year}`,
    title: h.name,
    date: format(h.date, "yyyy-MM-dd"),
    type: "feestdag" as const,
    description: "Nationale feestdag",
  }));
}

function computeEaster(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function getBirthdaysForMonth(users: User[], currentMonth: Date): CalendarEntry[] {
  const entries: CalendarEntry[] = [];
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  for (const u of users) {
    if (!u.birthDate || !u.active) continue;
    const bd = new Date(u.birthDate + "T00:00:00");
    if (bd.getMonth() === month) {
      const age = year - bd.getFullYear();
      entries.push({
        id: `verjaardag-${u.id}-${year}`,
        title: `${u.fullName} (${age} jaar)`,
        date: `${year}-${String(month + 1).padStart(2, "0")}-${String(bd.getDate()).padStart(2, "0")}`,
        type: "verjaardag",
        description: `Verjaardag van ${u.fullName}`,
      });
    }
  }
  return entries;
}

function getAnniversariesForMonth(users: User[], currentMonth: Date): CalendarEntry[] {
  const entries: CalendarEntry[] = [];
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  for (const u of users) {
    if (!u.startDate || !u.active) continue;
    const sd = new Date(u.startDate + "T00:00:00");
    if (sd.getMonth() === month && sd.getFullYear() < year) {
      const years = year - sd.getFullYear();
      entries.push({
        id: `jubileum-${u.id}-${year}`,
        title: `${u.fullName} (${years} jaar in dienst)`,
        date: `${year}-${String(month + 1).padStart(2, "0")}-${String(sd.getDate()).padStart(2, "0")}`,
        type: "jubileum",
        description: `Werkjubileum van ${u.fullName}`,
      });
    }
  }
  return entries;
}

const typeConfig: Record<string, { icon: typeof Cake; color: string; label: string }> = {
  verjaardag: {
    icon: Cake,
    color: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
    label: "Verjaardag",
  },
  jubileum: {
    icon: Award,
    color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    label: "Jubileum",
  },
  feestdag: {
    icon: Flag,
    color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    label: "Feestdag",
  },
  event: {
    icon: CalendarDays,
    color: "",
    label: "Evenement",
  },
};

const categoryColors: Record<string, string> = {
  vergadering: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  training: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  sociaal: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  deadline: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

function EventFormDialog({
  open,
  onOpenChange,
  editEvent,
  initialDate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editEvent?: Event | null;
  initialDate?: string;
}) {
  const { toast } = useToast();
  const { user } = useAuth();

  const form = useForm<z.infer<typeof eventFormSchema>>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      title: editEvent?.title || "",
      description: editEvent?.description || "",
      date: editEvent?.date || initialDate || "",
      endDate: editEvent?.endDate || "",
      time: editEvent?.time || "",
      location: editEvent?.location || "",
      category: editEvent?.category || "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof eventFormSchema>) => {
      const payload = {
        ...data,
        description: data.description || null,
        endDate: data.endDate || null,
        time: data.time || null,
        location: data.location || null,
        category: data.category || null,
        createdBy: user?.id || null,
      };
      if (editEvent) {
        await apiRequest("PATCH", `/api/events/${editEvent.id}`, payload);
      } else {
        await apiRequest("POST", "/api/events", payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: editEvent ? "Evenement bijgewerkt" : "Evenement aangemaakt" });
      onOpenChange(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Fout bij opslaan", variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editEvent ? "Evenement Bewerken" : "Nieuw Evenement"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem>
                <FormLabel>Titel</FormLabel>
                <FormControl><Input {...field} data-testid="input-event-title" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>Beschrijving</FormLabel>
                <FormControl><Textarea {...field} data-testid="input-event-description" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="date" render={({ field }) => (
                <FormItem>
                  <FormLabel>Startdatum</FormLabel>
                  <FormControl><Input type="date" {...field} data-testid="input-event-date" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="endDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Einddatum</FormLabel>
                  <FormControl><Input type="date" {...field} data-testid="input-event-enddate" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="time" render={({ field }) => (
                <FormItem>
                  <FormLabel>Tijd</FormLabel>
                  <FormControl><Input type="time" {...field} data-testid="input-event-time" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="location" render={({ field }) => (
                <FormItem>
                  <FormLabel>Locatie</FormLabel>
                  <FormControl><Input {...field} data-testid="input-event-location" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="category" render={({ field }) => (
              <FormItem>
                <FormLabel>Categorie</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-event-category"><SelectValue placeholder="Selecteer categorie" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="vergadering">Vergadering</SelectItem>
                    <SelectItem value="training">Training</SelectItem>
                    <SelectItem value="sociaal">Sociaal</SelectItem>
                    <SelectItem value="deadline">Deadline</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <Button type="submit" className="w-full" disabled={mutation.isPending} data-testid="button-submit-event">
              {mutation.isPending ? "Opslaan..." : editEvent ? "Bijwerken" : "Evenement Opslaan"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function DayDetail({
  date,
  entries,
  onClose,
  onEditEvent,
  onDeleteEvent,
  canManage,
}: {
  date: Date;
  entries: CalendarEntry[];
  onClose: () => void;
  onEditEvent: (e: Event) => void;
  onDeleteEvent: (id: string) => void;
  canManage: boolean;
}) {
  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{format(date, "EEEE d MMMM yyyy", { locale: nl })}</DialogTitle>
        </DialogHeader>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Geen items op deze dag</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {entries.map((entry) => {
              const conf = typeConfig[entry.type] || typeConfig.event;
              const Icon = conf.icon;
              const colorClass = entry.type === "event" && entry.category
                ? categoryColors[entry.category] || ""
                : conf.color;

              return (
                <div key={entry.id} className="flex items-start gap-3 p-2 rounded-md hover-elevate" data-testid={`detail-entry-${entry.id}`}>
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${colorClass || "bg-muted"}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{entry.title}</p>
                    {entry.description && (
                      <p className="text-xs text-muted-foreground mt-0.5">{entry.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <Badge variant="outline" className="text-xs">{conf.label}</Badge>
                      {entry.time && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" /> {entry.time}
                        </span>
                      )}
                      {entry.location && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" /> {entry.location}
                        </span>
                      )}
                    </div>
                  </div>
                  {entry.type === "event" && entry.event && canManage && (
                    <div className="flex gap-1 shrink-0">
                      <Button size="icon" variant="ghost" onClick={() => onEditEvent(entry.event!)} data-testid={`button-edit-event-${entry.event.id}`}>
                        <Pencil className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => onDeleteEvent(entry.event!.id)} data-testid={`button-delete-event-${entry.event.id}`}>
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function KalenderPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [createOpen, setCreateOpen] = useState(false);
  const [createDate, setCreateDate] = useState<string>("");
  const [editEvent, setEditEvent] = useState<Event | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: events, isLoading: loadingEvents } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/events/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Evenement verwijderd" });
      setSelectedDay(null);
    },
  });

  const canManage = user?.role === "admin" || user?.role === "manager";

  const allEntries = useMemo(() => {
    const year = currentMonth.getFullYear();
    const entries: CalendarEntry[] = [];

    if (events) {
      for (const ev of events) {
        entries.push({
          id: `event-${ev.id}`,
          title: ev.title,
          date: ev.date,
          type: "event",
          category: ev.category,
          description: ev.description,
          time: ev.time,
          location: ev.location,
          event: ev,
        });
      }
    }

    if (users) {
      entries.push(...getBirthdaysForMonth(users, currentMonth));
      entries.push(...getAnniversariesForMonth(users, currentMonth));
    }

    const prevMonth = subMonths(currentMonth, 1);
    const nextMonth = addMonths(currentMonth, 1);
    if (users) {
      entries.push(...getBirthdaysForMonth(users, prevMonth));
      entries.push(...getAnniversariesForMonth(users, prevMonth));
      entries.push(...getBirthdaysForMonth(users, nextMonth));
      entries.push(...getAnniversariesForMonth(users, nextMonth));
    }

    entries.push(...getDutchHolidays(year));
    if (currentMonth.getMonth() === 0) entries.push(...getDutchHolidays(year - 1));
    if (currentMonth.getMonth() === 11) entries.push(...getDutchHolidays(year + 1));

    return entries;
  }, [events, users, currentMonth]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getEntriesForDay = (day: Date): CalendarEntry[] => {
    const dayStr = format(day, "yyyy-MM-dd");
    return allEntries.filter((e) => e.date === dayStr);
  };

  const weekDays = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];

  const selectedDayEntries = selectedDay ? getEntriesForDay(selectedDay) : [];

  const legendItems = [
    { type: "event", label: "Evenement", color: "bg-primary/20" },
    { type: "verjaardag", label: "Verjaardag", color: "bg-pink-200 dark:bg-pink-900/40" },
    { type: "jubileum", label: "Jubileum", color: "bg-amber-200 dark:bg-amber-900/40" },
    { type: "feestdag", label: "Feestdag", color: "bg-orange-200 dark:bg-orange-900/40" },
  ];

  if (loadingEvents) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4 overflow-auto h-full">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-kalender-title">Evenementen Kalender</h1>
          <p className="text-muted-foreground text-sm">Evenementen, verjaardagen, jubilea en feestdagen</p>
        </div>
        <Button onClick={() => { setCreateDate(""); setCreateOpen(true); }} data-testid="button-add-event">
          <Plus className="h-4 w-4 mr-2" />
          Nieuw Evenement
        </Button>
      </div>

      <EventFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        initialDate={createDate}
      />
      {editEvent && (
        <EventFormDialog
          open={!!editEvent}
          onOpenChange={(open) => { if (!open) setEditEvent(null); }}
          editEvent={editEvent}
        />
      )}
      {selectedDay && (
        <DayDetail
          date={selectedDay}
          entries={selectedDayEntries}
          onClose={() => setSelectedDay(null)}
          onEditEvent={(e) => { setSelectedDay(null); setEditEvent(e); }}
          onDeleteEvent={(id) => deleteMutation.mutate(id)}
          canManage={!!canManage}
        />
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {legendItems.map((item) => (
          <div key={item.type} className="flex items-center gap-1.5">
            <div className={`h-3 w-3 rounded-sm ${item.color}`} />
            <span className="text-xs text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4 mb-4">
            <Button size="icon" variant="ghost" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} data-testid="button-prev-month">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-lg font-semibold capitalize" data-testid="text-current-month">
              {format(currentMonth, "MMMM yyyy", { locale: nl })}
            </h2>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())} data-testid="button-today">
                Vandaag
              </Button>
              <Button size="icon" variant="ghost" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} data-testid="button-next-month">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-px bg-border rounded-md overflow-hidden">
            {weekDays.map((day) => (
              <div key={day} className="bg-muted p-2 text-center text-xs font-medium text-muted-foreground">
                {day}
              </div>
            ))}

            {calendarDays.map((day) => {
              const dayEntries = getEntriesForDay(day);
              const inMonth = isSameMonth(day, currentMonth);
              const today = isToday(day);
              const dayOfWeek = day.getDay();
              const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
              const isPast = day < new Date(new Date().setHours(0, 0, 0, 0)) && !today;
              const isGray = inMonth && (isPast || isWeekend);
              const hasEvents = dayEntries.some((e) => e.type === "event");
              const hasBirthday = dayEntries.some((e) => e.type === "verjaardag");
              const hasAnniversary = dayEntries.some((e) => e.type === "jubileum");
              const hasHoliday = dayEntries.some((e) => e.type === "feestdag");

              return (
                <div
                  key={day.toISOString()}
                  className={`min-h-[5rem] p-1 cursor-pointer transition-colors hover:bg-muted/50 ${
                    isGray ? "bg-muted/60" : "bg-background"
                  } ${!inMonth ? "opacity-40" : ""} ${today ? "ring-1 ring-inset ring-primary" : ""}`}
                  onClick={() => setSelectedDay(day)}
                  data-testid={`cal-day-${format(day, "yyyy-MM-dd")}`}
                >
                  <div className="flex items-start justify-between">
                    <span className={`text-sm font-medium leading-none p-1 rounded-md ${
                      today ? "bg-primary text-primary-foreground" : ""
                    }`}>
                      {format(day, "d")}
                    </span>
                    {dayEntries.length > 0 && (
                      <div className="flex gap-0.5 mt-0.5">
                        {hasEvents && <div className="h-1.5 w-1.5 rounded-full bg-primary" />}
                        {hasBirthday && <div className="h-1.5 w-1.5 rounded-full bg-pink-500" />}
                        {hasAnniversary && <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />}
                        {hasHoliday && <div className="h-1.5 w-1.5 rounded-full bg-orange-500" />}
                      </div>
                    )}
                  </div>
                  <div className="mt-0.5 space-y-0.5">
                    {dayEntries.slice(0, 3).map((entry) => {
                      const colorMap: Record<string, string> = {
                        verjaardag: "bg-pink-200 dark:bg-pink-900/40 text-pink-800 dark:text-pink-300",
                        jubileum: "bg-amber-200 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300",
                        feestdag: "bg-orange-200 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300",
                        event: entry.category && categoryColors[entry.category]
                          ? categoryColors[entry.category]
                          : "bg-primary/10 text-primary",
                      };
                      return (
                        <div
                          key={entry.id}
                          className={`text-[10px] leading-tight px-1 py-0.5 rounded truncate ${colorMap[entry.type] || "bg-muted"}`}
                          title={entry.title}
                        >
                          {entry.title}
                        </div>
                      );
                    })}
                    {dayEntries.length > 3 && (
                      <div className="text-[10px] text-muted-foreground px-1">
                        +{dayEntries.length - 3} meer
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
