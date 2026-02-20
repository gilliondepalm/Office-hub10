import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Users, Mail, Building2, Pencil, UserCheck, UserX, CalendarDays, Briefcase, TrendingUp, Trash2, GraduationCap, CheckCircle2, Circle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import type { User, Department, PositionHistory, PersonalDevelopment } from "@shared/schema";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/lib/auth";

const userFormSchema = z.object({
  username: z.string().min(1, "Gebruikersnaam is verplicht"),
  password: z.string().min(4, "Minimaal 4 tekens"),
  fullName: z.string().min(1, "Volledige naam is verplicht"),
  email: z.string().email("Ongeldig e-mailadres"),
  role: z.string().default("employee"),
  department: z.string().optional(),
  startDate: z.string().min(1, "Datum in dienst is verplicht"),
  birthDate: z.string().optional(),
});

const editFormSchema = z.object({
  username: z.string().min(1, "Gebruikersnaam is verplicht"),
  password: z.string().optional(),
  fullName: z.string().min(1, "Volledige naam is verplicht"),
  email: z.string().email("Ongeldig e-mailadres"),
  role: z.string(),
  department: z.string().optional(),
  startDate: z.string().min(1, "Datum in dienst is verplicht"),
  birthDate: z.string().optional(),
});

const deactivateFormSchema = z.object({
  endDate: z.string().min(1, "Datum uit dienst is verplicht"),
});

function EditDialog({
  user,
  departments,
  open,
  onOpenChange,
}: {
  user: User;
  departments: Department[] | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const form = useForm<z.infer<typeof editFormSchema>>({
    resolver: zodResolver(editFormSchema),
    defaultValues: {
      username: user.username,
      password: "",
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      department: user.department || "",
      startDate: user.startDate || "",
      birthDate: user.birthDate || "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof editFormSchema>) => {
      const payload: Record<string, any> = {
        username: data.username,
        fullName: data.fullName,
        email: data.email,
        role: data.role,
        department: data.department || null,
        startDate: data.startDate,
        birthDate: data.birthDate || null,
      };
      if (data.password && data.password.length > 0) {
        payload.password = data.password;
      }
      await apiRequest("PATCH", `/api/users/${user.id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Medewerker bijgewerkt" });
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast({ title: "Fout bij bijwerken", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Medewerker Bewerken</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="username" render={({ field }) => (
                <FormItem>
                  <FormLabel>Gebruikersnaam</FormLabel>
                  <FormControl><Input {...field} data-testid="input-edit-username" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem>
                  <FormLabel>Wachtwoord</FormLabel>
                  <FormControl><Input {...field} type="password" placeholder="Laat leeg om niet te wijzigen" data-testid="input-edit-password" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="fullName" render={({ field }) => (
                <FormItem>
                  <FormLabel>Volledige Naam</FormLabel>
                  <FormControl><Input {...field} data-testid="input-edit-fullname" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail</FormLabel>
                  <FormControl><Input {...field} type="email" data-testid="input-edit-email" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="role" render={({ field }) => (
                <FormItem>
                  <FormLabel>Rol</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-edit-role"><SelectValue /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="employee">Medewerker</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="admin">Beheerder</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="department" render={({ field }) => (
                <FormItem>
                  <FormLabel>Afdeling</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-edit-department"><SelectValue placeholder="Selecteer" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {departments?.map((d) => (
                        <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="startDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Datum in Dienst</FormLabel>
                  <FormControl><Input {...field} type="date" data-testid="input-edit-startdate" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="birthDate" render={({ field }) => (
                <FormItem>
                  <FormLabel>Geboortedatum</FormLabel>
                  <FormControl><Input {...field} type="date" data-testid="input-edit-birthdate" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <Button type="submit" className="w-full" disabled={mutation.isPending} data-testid="button-save-edit">
              {mutation.isPending ? "Opslaan..." : "Wijzigingen Opslaan"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function DeactivateDialog({
  user,
  open,
  onOpenChange,
}: {
  user: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const form = useForm<z.infer<typeof deactivateFormSchema>>({
    resolver: zodResolver(deactivateFormSchema),
    defaultValues: {
      endDate: new Date().toISOString().split("T")[0],
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof deactivateFormSchema>) => {
      await apiRequest("PATCH", `/api/users/${user.id}`, {
        active: false,
        endDate: data.endDate,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: `${user.fullName} is nu inactief` });
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast({ title: "Fout bij deactiveren", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Medewerker Deactiveren</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Vul de datum uit dienst in voor <span className="font-medium text-foreground">{user.fullName}</span>.
        </p>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
            <FormField control={form.control} name="endDate" render={({ field }) => (
              <FormItem>
                <FormLabel>Datum uit Dienst</FormLabel>
                <FormControl><Input {...field} type="date" data-testid="input-end-date" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <Button type="submit" variant="destructive" className="w-full" disabled={mutation.isPending} data-testid="button-confirm-deactivate">
              {mutation.isPending ? "Deactiveren..." : "Deactiveren"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

const positionFormSchema = z.object({
  functionTitle: z.string().min(1, "Functie is verplicht"),
  startDate: z.string().min(1, "Startdatum is verplicht"),
  endDate: z.string().optional(),
  salary: z.string().optional(),
  notes: z.string().optional(),
});

function PositionHistoryDialog({
  user,
  open,
  onOpenChange,
  isAdmin,
}: {
  user: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAdmin: boolean;
}) {
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<PositionHistory | null>(null);

  const { data: history, isLoading } = useQuery<PositionHistory[]>({
    queryKey: ["/api/position-history/user", user.id],
    queryFn: async () => {
      const res = await fetch(`/api/position-history/user/${user.id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Fout bij ophalen");
      return res.json();
    },
    enabled: open,
  });

  const form = useForm<z.infer<typeof positionFormSchema>>({
    resolver: zodResolver(positionFormSchema),
    defaultValues: { functionTitle: "", startDate: "", endDate: "", salary: "", notes: "" },
  });

  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof positionFormSchema>) => {
      await apiRequest("POST", "/api/position-history", {
        userId: user.id,
        functionTitle: data.functionTitle,
        startDate: data.startDate,
        endDate: data.endDate || null,
        salary: data.salary ? parseInt(data.salary) : null,
        notes: data.notes || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/position-history/user", user.id] });
      toast({ title: "Functiehistorie toegevoegd" });
      setAddOpen(false);
      form.reset();
    },
    onError: (err: any) => {
      toast({ title: "Fout bij toevoegen", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: z.infer<typeof positionFormSchema> }) => {
      await apiRequest("PATCH", `/api/position-history/${id}`, {
        functionTitle: data.functionTitle,
        startDate: data.startDate,
        endDate: data.endDate || null,
        salary: data.salary ? parseInt(data.salary) : null,
        notes: data.notes || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/position-history/user", user.id] });
      toast({ title: "Functiehistorie bijgewerkt" });
      setEditEntry(null);
      form.reset();
    },
    onError: (err: any) => {
      toast({ title: "Fout bij bijwerken", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/position-history/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/position-history/user", user.id] });
      toast({ title: "Verwijderd" });
    },
  });

  const formatCurrency = (amount: number | null) => {
    if (!amount) return "-";
    return "XCG " + new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 0 }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Functie & Salarisontwikkeling - {user.fullName}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : history && history.length > 0 ? (
          <div className="space-y-3">
            {history.map((entry, idx) => (
              <Card key={entry.id} className={idx === 0 ? "border-primary/30" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium" data-testid={`text-position-title-${entry.id}`}>{entry.functionTitle}</p>
                        {!entry.endDate && <Badge variant="default" className="text-xs">Huidig</Badge>}
                      </div>
                      <div className="flex items-center gap-4 mt-1 flex-wrap">
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <CalendarDays className="h-3 w-3" />
                          {format(new Date(entry.startDate + "T00:00:00"), "d MMM yyyy", { locale: nl })}
                          {" - "}
                          {entry.endDate
                            ? format(new Date(entry.endDate + "T00:00:00"), "d MMM yyyy", { locale: nl })
                            : "heden"}
                        </span>
                        <span className="text-sm font-medium flex items-center gap-1" data-testid={`text-salary-${entry.id}`}>
                          <TrendingUp className="h-3 w-3 text-muted-foreground" />
                          {formatCurrency(entry.salary)} /mnd
                        </span>
                      </div>
                      {entry.notes && (
                        <p className="text-xs text-muted-foreground mt-1">{entry.notes}</p>
                      )}
                    </div>
                    {isAdmin && (
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setEditEntry(entry);
                            setAddOpen(false);
                            form.reset({
                              functionTitle: entry.functionTitle,
                              startDate: entry.startDate,
                              endDate: entry.endDate || "",
                              salary: entry.salary ? String(entry.salary) : "",
                              notes: entry.notes || "",
                            });
                          }}
                          data-testid={`button-edit-position-${entry.id}`}
                        >
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteMutation.mutate(entry.id)}
                          disabled={deleteMutation.isPending}
                          data-testid={`button-delete-position-${entry.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4 text-center">Geen functiehistorie beschikbaar</p>
        )}

        {isAdmin && (
          <div className="mt-2">
            {(addOpen || editEntry) ? (
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm font-medium mb-3">{editEntry ? "Functie Bewerken" : "Nieuwe Functie Toevoegen"}</p>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit((d) => {
                      if (editEntry) {
                        updateMutation.mutate({ id: editEntry.id, data: d });
                      } else {
                        createMutation.mutate(d);
                      }
                    })} className="space-y-3">
                      <FormField control={form.control} name="functionTitle" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Functietitel</FormLabel>
                          <FormControl><Input {...field} placeholder="bijv. Senior Developer" data-testid="input-position-title" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <div className="grid grid-cols-2 gap-3">
                        <FormField control={form.control} name="startDate" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Startdatum</FormLabel>
                            <FormControl><Input {...field} type="date" data-testid="input-position-start" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="endDate" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Einddatum</FormLabel>
                            <FormControl><Input {...field} type="date" placeholder="Leeg = huidig" data-testid="input-position-end" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <FormField control={form.control} name="salary" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Salaris (bruto/mnd)</FormLabel>
                            <FormControl><Input {...field} type="number" placeholder="bijv. 3500" data-testid="input-position-salary" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="notes" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Opmerking</FormLabel>
                            <FormControl><Input {...field} placeholder="bijv. Promotie" data-testid="input-position-notes" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                      <div className="flex gap-2">
                        <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-position">
                          {(createMutation.isPending || updateMutation.isPending) ? "Opslaan..." : editEntry ? "Wijzigen" : "Toevoegen"}
                        </Button>
                        <Button type="button" variant="outline" onClick={() => { setAddOpen(false); setEditEntry(null); form.reset(); }}>
                          Annuleren
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            ) : (
              <Button variant="outline" onClick={() => { setAddOpen(true); form.reset({ functionTitle: "", startDate: "", endDate: "", salary: "", notes: "" }); }} className="w-full" data-testid="button-add-position">
                <Plus className="h-4 w-4 mr-2" />
                Functie Toevoegen
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

const devFormSchema = z.object({
  trainingName: z.string().min(1, "Naam opleiding/training is verplicht"),
  startDate: z.string().min(1, "Startdatum is verplicht"),
  endDate: z.string().optional(),
  completed: z.boolean().default(false),
});

function PersonalDevelopmentDialog({
  user,
  open,
  onOpenChange,
  isAdmin,
}: {
  user: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAdmin: boolean;
}) {
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<PersonalDevelopment | null>(null);

  const form = useForm<z.infer<typeof devFormSchema>>({
    resolver: zodResolver(devFormSchema),
    defaultValues: { trainingName: "", startDate: "", endDate: "", completed: false },
  });

  const { data: devEntries, isLoading } = useQuery<PersonalDevelopment[]>({
    queryKey: ["/api/personal-development/user", user.id],
    queryFn: async () => {
      const res = await fetch(`/api/personal-development/user/${user.id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Fout bij laden");
      return res.json();
    },
    enabled: open,
  });

  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof devFormSchema>) => {
      await apiRequest("POST", "/api/personal-development", {
        userId: user.id,
        trainingName: data.trainingName,
        startDate: data.startDate,
        endDate: data.endDate || null,
        completed: data.completed,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/personal-development/user", user.id] });
      toast({ title: "Opleiding toegevoegd" });
      setAddOpen(false);
      form.reset();
    },
    onError: (err: any) => {
      toast({ title: "Fout bij toevoegen", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: z.infer<typeof devFormSchema> }) => {
      await apiRequest("PATCH", `/api/personal-development/${id}`, {
        trainingName: data.trainingName,
        startDate: data.startDate,
        endDate: data.endDate || null,
        completed: data.completed,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/personal-development/user", user.id] });
      toast({ title: "Opleiding bijgewerkt" });
      setEditEntry(null);
      form.reset();
    },
    onError: (err: any) => {
      toast({ title: "Fout bij bijwerken", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/personal-development/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/personal-development/user", user.id] });
      toast({ title: "Verwijderd" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Persoonlijke Ontwikkeling - {user.fullName}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : devEntries && devEntries.length > 0 ? (
          <div className="space-y-3">
            {devEntries.map((entry) => (
              <Card key={entry.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {entry.completed ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                        <p className="font-medium" data-testid={`text-dev-name-${entry.id}`}>{entry.trainingName}</p>
                        <Badge variant={entry.completed ? "default" : "outline"} className="text-xs">
                          {entry.completed ? "Afgerond" : "Lopend"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" />
                        {format(new Date(entry.startDate + "T00:00:00"), "d MMM yyyy", { locale: nl })}
                        {" - "}
                        {entry.endDate
                          ? format(new Date(entry.endDate + "T00:00:00"), "d MMM yyyy", { locale: nl })
                          : "heden"}
                      </p>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setEditEntry(entry);
                            setAddOpen(false);
                            form.reset({
                              trainingName: entry.trainingName,
                              startDate: entry.startDate,
                              endDate: entry.endDate || "",
                              completed: entry.completed,
                            });
                          }}
                          data-testid={`button-edit-dev-${entry.id}`}
                        >
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteMutation.mutate(entry.id)}
                          disabled={deleteMutation.isPending}
                          data-testid={`button-delete-dev-${entry.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground py-4 text-center">Geen opleidingen/trainingen beschikbaar</p>
        )}

        {isAdmin && (
          <div className="mt-2">
            {(addOpen || editEntry) ? (
              <Card>
                <CardContent className="p-4">
                  <p className="text-sm font-medium mb-3">{editEntry ? "Opleiding Bewerken" : "Nieuwe Opleiding Toevoegen"}</p>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit((d) => {
                      if (editEntry) {
                        updateMutation.mutate({ id: editEntry.id, data: d });
                      } else {
                        createMutation.mutate(d);
                      }
                    })} className="space-y-3">
                      <FormField control={form.control} name="trainingName" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Opleiding / Training</FormLabel>
                          <FormControl><Input {...field} placeholder="bijv. ITIL Foundation" data-testid="input-dev-name" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <div className="grid grid-cols-2 gap-3">
                        <FormField control={form.control} name="startDate" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Van</FormLabel>
                            <FormControl><Input {...field} type="date" data-testid="input-dev-start" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        <FormField control={form.control} name="endDate" render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tot</FormLabel>
                            <FormControl><Input {...field} type="date" data-testid="input-dev-end" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                      </div>
                      <FormField control={form.control} name="completed" render={({ field }) => (
                        <FormItem className="flex items-center gap-2">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              data-testid="checkbox-dev-completed"
                            />
                          </FormControl>
                          <FormLabel className="!mt-0">Afgerond</FormLabel>
                        </FormItem>
                      )} />
                      <div className="flex gap-2">
                        <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} data-testid="button-save-dev">
                          {(createMutation.isPending || updateMutation.isPending) ? "Opslaan..." : editEntry ? "Wijzigen" : "Toevoegen"}
                        </Button>
                        <Button type="button" variant="outline" onClick={() => { setAddOpen(false); setEditEntry(null); form.reset(); }}>
                          Annuleren
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            ) : (
              <Button variant="outline" onClick={() => { setAddOpen(true); form.reset({ trainingName: "", startDate: "", endDate: "", completed: false }); }} className="w-full" data-testid="button-add-dev">
                <Plus className="h-4 w-4 mr-2" />
                Opleiding Toevoegen
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function InlinePositionHistory({ user }: { user: User }) {
  const { data: history, isLoading } = useQuery<PositionHistory[]>({
    queryKey: ["/api/position-history/user", user.id],
    queryFn: async () => {
      const res = await fetch(`/api/position-history/user/${user.id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Fout bij ophalen");
      return res.json();
    },
  });

  return (
    <Card className="h-full">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Briefcase className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">Functie & Salarisontwikkeling</h3>
          <Badge variant="secondary" className="ml-auto text-xs">{history?.length || 0}</Badge>
        </div>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => <Skeleton key={i} className="h-16" />)}
          </div>
        ) : !history?.length ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Geen functiehistorie beschikbaar</p>
        ) : (
          <div className="space-y-2">
            {history.map((entry, idx) => (
              <div key={entry.id} className={`p-3 rounded-md ${idx === 0 ? "bg-primary/5" : "hover-elevate"}`} data-testid={`inline-position-${entry.id}`}>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium">{entry.functionTitle}</p>
                  {!entry.endDate && <Badge variant="default" className="text-xs">Huidig</Badge>}
                </div>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <CalendarDays className="h-3 w-3" />
                    {format(new Date(entry.startDate + "T00:00:00"), "d MMM yyyy", { locale: nl })}
                    {" - "}
                    {entry.endDate
                      ? format(new Date(entry.endDate + "T00:00:00"), "d MMM yyyy", { locale: nl })
                      : "heden"}
                  </span>
                  {entry.salary && (
                    <span className="text-xs font-medium flex items-center gap-1">
                      <TrendingUp className="h-3 w-3 text-muted-foreground" />
                      XCG {new Intl.NumberFormat("nl-NL", { maximumFractionDigits: 0 }).format(entry.salary)} /mnd
                    </span>
                  )}
                </div>
                {entry.notes && <p className="text-xs text-muted-foreground mt-1">{entry.notes}</p>}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function InlinePersonalDevelopment({ user }: { user: User }) {
  const { data: devEntries, isLoading } = useQuery<PersonalDevelopment[]>({
    queryKey: ["/api/personal-development/user", user.id],
    queryFn: async () => {
      const res = await fetch(`/api/personal-development/user/${user.id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Fout bij laden");
      return res.json();
    },
  });

  return (
    <Card className="h-full">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <GraduationCap className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">Persoonlijke Ontwikkeling</h3>
          <Badge variant="secondary" className="ml-auto text-xs">{devEntries?.length || 0}</Badge>
        </div>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => <Skeleton key={i} className="h-16" />)}
          </div>
        ) : !devEntries?.length ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Geen opleidingen/trainingen beschikbaar</p>
        ) : (
          <div className="space-y-2">
            {devEntries.map((entry) => (
              <div key={entry.id} className="p-3 rounded-md hover-elevate" data-testid={`inline-dev-${entry.id}`}>
                <div className="flex items-center gap-2 flex-wrap">
                  {entry.completed ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <p className="text-sm font-medium">{entry.trainingName}</p>
                  <Badge variant={entry.completed ? "default" : "outline"} className="text-xs">
                    {entry.completed ? "Afgerond" : "Lopend"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  <CalendarDays className="h-3 w-3 inline mr-1" />
                  {format(new Date(entry.startDate + "T00:00:00"), "d MMM yyyy", { locale: nl })}
                  {" - "}
                  {entry.endDate
                    ? format(new Date(entry.endDate + "T00:00:00"), "d MMM yyyy", { locale: nl })
                    : "heden"}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function PersonaliaPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [deactivateUser, setDeactivateUser] = useState<User | null>(null);
  const [historyUser, setHistoryUser] = useState<User | null>(null);
  const [devUser, setDevUser] = useState<User | null>(null);
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: departments } = useQuery<Department[]>({
    queryKey: ["/api/departments"],
  });

  const createForm = useForm<z.infer<typeof userFormSchema>>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      username: "", password: "", fullName: "", email: "",
      role: "employee", department: "",
      startDate: new Date().toISOString().split("T")[0],
      birthDate: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof userFormSchema>) => {
      await apiRequest("POST", "/api/users", {
        ...data,
        department: data.department || null,
        birthDate: data.birthDate || null,
        avatar: null,
        active: true,
        endDate: null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Medewerker aangemaakt" });
      setCreateOpen(false);
      createForm.reset();
    },
    onError: (err: any) => {
      toast({ title: "Fout bij aanmaken", description: err.message, variant: "destructive" });
    },
  });

  const activateMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PATCH", `/api/users/${id}`, {
        active: true,
        endDate: null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Medewerker geactiveerd" });
    },
    onError: (err: any) => {
      toast({ title: "Fout bij activeren", description: err.message, variant: "destructive" });
    },
  });

  const roleLabels: Record<string, string> = {
    admin: "Beheerder",
    manager: "Manager",
    employee: "Medewerker",
  };

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
          <h1 className="text-2xl font-bold" data-testid="text-personalia-title">Personalia</h1>
          <p className="text-muted-foreground text-sm">{currentUser?.role === "admin" ? "Overzicht van alle medewerkers" : "Uw persoonlijke gegevens"}</p>
        </div>
        {currentUser?.role === "admin" && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-user">
                <Plus className="h-4 w-4 mr-2" />
                Nieuwe Medewerker
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Nieuwe Medewerker</DialogTitle>
              </DialogHeader>
              <Form {...createForm}>
                <form onSubmit={createForm.handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={createForm.control} name="fullName" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Volledige Naam</FormLabel>
                        <FormControl><Input {...field} data-testid="input-user-fullname" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={createForm.control} name="email" render={({ field }) => (
                      <FormItem>
                        <FormLabel>E-mail</FormLabel>
                        <FormControl><Input {...field} type="email" data-testid="input-user-email" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={createForm.control} name="username" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gebruikersnaam</FormLabel>
                        <FormControl><Input {...field} data-testid="input-user-username" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={createForm.control} name="password" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Wachtwoord</FormLabel>
                        <FormControl><Input {...field} type="password" data-testid="input-user-password" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={createForm.control} name="role" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rol</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-user-role"><SelectValue /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="employee">Medewerker</SelectItem>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="admin">Beheerder</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={createForm.control} name="department" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Afdeling</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-user-department"><SelectValue placeholder="Selecteer" /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {departments?.map((d) => (
                              <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={createForm.control} name="startDate" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Datum in Dienst</FormLabel>
                        <FormControl><Input {...field} type="date" data-testid="input-user-startdate" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={createForm.control} name="birthDate" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Geboortedatum</FormLabel>
                        <FormControl><Input {...field} type="date" data-testid="input-user-birthdate" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-user">
                    {createMutation.isPending ? "Opslaan..." : "Medewerker Opslaan"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {editUser && (
        <EditDialog
          user={editUser}
          departments={departments}
          open={!!editUser}
          onOpenChange={(open) => { if (!open) setEditUser(null); }}
        />
      )}

      {deactivateUser && (
        <DeactivateDialog
          user={deactivateUser}
          open={!!deactivateUser}
          onOpenChange={(open) => { if (!open) setDeactivateUser(null); }}
        />
      )}

      {historyUser && (
        <PositionHistoryDialog
          user={historyUser}
          open={!!historyUser}
          onOpenChange={(open) => { if (!open) setHistoryUser(null); }}
          isAdmin={currentUser?.role === "admin"}
        />
      )}

      {devUser && (
        <PersonalDevelopmentDialog
          user={devUser}
          open={!!devUser}
          onOpenChange={(open) => { if (!open) setDevUser(null); }}
          isAdmin={currentUser?.role === "admin"}
        />
      )}

      {(() => {
        const visibleUsers = currentUser?.role === "admin" ? users : users?.filter(u => u.id === currentUser?.id);
        if (!visibleUsers || visibleUsers.length === 0) return (
          <Card>
            <CardContent className="flex flex-col items-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Geen medewerkers gevonden</p>
            </CardContent>
          </Card>
        );
        {
          const grouped: Record<string, User[]> = {};
          visibleUsers.forEach((u) => {
            const dept = u.department || "Geen afdeling";
            if (!grouped[dept]) grouped[dept] = [];
            grouped[dept].push(u);
          });

          const sortedDeptNames = Object.keys(grouped).sort((a, b) => {
            if (a === "Geen afdeling") return 1;
            if (b === "Geen afdeling") return -1;
            return a.localeCompare(b, "nl");
          });

          sortedDeptNames.forEach((dept) => {
            grouped[dept].sort((a, b) => {
              const aIsManager = a.role === "manager" || a.role === "admin";
              const bIsManager = b.role === "manager" || b.role === "admin";
              if (aIsManager && !bIsManager) return -1;
              if (!aIsManager && bIsManager) return 1;
              return a.fullName.localeCompare(b.fullName, "nl");
            });
          });

          return (
            <div className="space-y-6">
              {sortedDeptNames.map((deptName) => (
                <div key={deptName}>
                  <div className="flex items-center gap-2 mb-3">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                    <h2 className="text-lg font-semibold" data-testid={`text-department-${deptName}`}>{deptName}</h2>
                    <Badge variant="outline" className="text-xs">{grouped[deptName].length}</Badge>
                  </div>
                  <Card>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Medewerker</TableHead>
                              <TableHead>E-mail</TableHead>
                              <TableHead>Rol</TableHead>
                              <TableHead>Geboortedatum</TableHead>
                              <TableHead>In Dienst</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="text-right">Acties</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {grouped[deptName].map((u) => {
                              const initials = u.fullName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
                              const isManager = u.role === "manager" || u.role === "admin";
                              return (
                                <TableRow key={u.id} className={!u.active ? "opacity-60" : ""} data-testid={`row-user-${u.id}`}>
                                  <TableCell>
                                    <div className="flex items-center gap-3">
                                      <Avatar className="h-8 w-8">
                                        <AvatarFallback className={`text-xs ${isManager ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"}`}>{initials}</AvatarFallback>
                                      </Avatar>
                                      <div>
                                        <p className="font-medium text-sm">{u.fullName}</p>
                                        <p className="text-xs text-muted-foreground">@{u.username}</p>
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                                      <Mail className="h-3 w-3" />
                                      {u.email}
                                    </span>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={isManager ? "default" : "secondary"} className="text-xs">
                                      {roleLabels[u.role] || u.role}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    {u.birthDate ? (
                                      <span className="text-sm">
                                        {format(new Date(u.birthDate + "T00:00:00"), "d MMM yyyy", { locale: nl })}
                                      </span>
                                    ) : (
                                      <span className="text-sm text-muted-foreground">-</span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex flex-col gap-0.5">
                                      {u.startDate ? (
                                        <span className="flex items-center gap-1 text-sm">
                                          <CalendarDays className="h-3 w-3 text-muted-foreground" />
                                          {format(new Date(u.startDate + "T00:00:00"), "d MMM yyyy", { locale: nl })}
                                        </span>
                                      ) : (
                                        <span className="text-sm text-muted-foreground">-</span>
                                      )}
                                      {u.endDate && (
                                        <span className="text-xs text-muted-foreground">
                                          Uit: {format(new Date(u.endDate + "T00:00:00"), "d MMM yyyy", { locale: nl })}
                                        </span>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={u.active ? "default" : "outline"} className="text-xs" data-testid={`status-user-${u.id}`}>
                                      {u.active ? "Actief" : "Inactief"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center justify-end gap-1">
                                      {(currentUser?.role === "admin" || currentUser?.id === u.id) && (
                                        <>
                                          <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => setHistoryUser(u)}
                                            data-testid={`button-history-user-${u.id}`}
                                            title="Functie & Salaris"
                                          >
                                            <Briefcase className="h-4 w-4 text-muted-foreground" />
                                          </Button>
                                          <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => setDevUser(u)}
                                            data-testid={`button-dev-user-${u.id}`}
                                            title="Persoonlijke Ontwikkeling"
                                          >
                                            <GraduationCap className="h-4 w-4 text-muted-foreground" />
                                          </Button>
                                        </>
                                      )}
                                      {currentUser?.role === "admin" && (
                                        <>
                                          <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => setEditUser(u)}
                                            data-testid={`button-edit-user-${u.id}`}
                                          >
                                            <Pencil className="h-4 w-4 text-muted-foreground" />
                                          </Button>
                                          {u.id !== currentUser.id && (
                                            u.active ? (
                                              <Button
                                                size="icon"
                                                variant="ghost"
                                                onClick={() => setDeactivateUser(u)}
                                                data-testid={`button-deactivate-user-${u.id}`}
                                              >
                                                <UserX className="h-4 w-4 text-muted-foreground" />
                                              </Button>
                                            ) : (
                                              <Button
                                                size="icon"
                                                variant="ghost"
                                                onClick={() => activateMutation.mutate(u.id)}
                                                disabled={activateMutation.isPending}
                                                data-testid={`button-activate-user-${u.id}`}
                                              >
                                                <UserCheck className="h-4 w-4 text-muted-foreground" />
                                              </Button>
                                            )
                                          )}
                                        </>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
              {currentUser?.role !== "admin" && currentUser && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InlinePositionHistory user={currentUser as User} />
                  <InlinePersonalDevelopment user={currentUser as User} />
                </div>
              )}
            </div>
          );
        }
      })()}
    </div>
  );
}
