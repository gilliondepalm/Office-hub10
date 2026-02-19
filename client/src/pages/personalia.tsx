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
import { Plus, Users, Mail, Building2, Pencil, UserCheck, UserX, CalendarDays } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import type { User, Department } from "@shared/schema";
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
      await apiRequest("PATCH", `/api/users/${user.id}`, {
        ...data,
        department: data.department || null,
        birthDate: data.birthDate || null,
      });
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

export default function PersonaliaPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [deactivateUser, setDeactivateUser] = useState<User | null>(null);
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
          <p className="text-muted-foreground text-sm">Overzicht van alle medewerkers</p>
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

      {(!users || users.length === 0) ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Geen medewerkers gevonden</p>
          </CardContent>
        </Card>
      ) : (
        (() => {
          const grouped: Record<string, User[]> = {};
          users.forEach((u) => {
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
                              {currentUser?.role === "admin" && <TableHead className="text-right">Acties</TableHead>}
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
                                  {currentUser?.role === "admin" && (
                                    <TableCell>
                                      <div className="flex items-center justify-end gap-1">
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
                                      </div>
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
                </div>
              ))}
            </div>
          );
        })()
      )}
    </div>
  );
}
