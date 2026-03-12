import { useState, useRef } from "react";
import { PageHero } from "@/components/page-hero";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Avatar, AvatarFallback,
} from "@/components/ui/avatar";
import {
  Shield, Save, Users, Camera, ImageIcon, KeyRound,
  Building2, Briefcase, Plus, Trash2, Pencil,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User, Department, JobFunction } from "@shared/schema";
import { useAuth } from "@/lib/auth";
import { isAdminRole } from "@shared/schema";

const ALL_MODULES = [
  { key: "dashboard", label: "Dashboard" },
  { key: "kalender", label: "Evenementen Kalender" },
  { key: "aankondigingen", label: "Aankondigingen" },
  { key: "organisatie", label: "Organisatie" },
  { key: "personalia", label: "Personalia" },
  { key: "verzuim", label: "Verzuim" },
  { key: "beloningen", label: "Beloningen" },
  { key: "applicaties", label: "Applicaties" },
  { key: "beheer", label: "Beheer (Admin)" },
];

type SafeUser = Omit<User, "password">;

const departmentFormSchema = z.object({
  name: z.string().min(1, "Naam is verplicht"),
  description: z.string().optional(),
});

const jobFunctionFormSchema = z.object({
  name: z.string().min(1, "Naam is verplicht"),
  description: z.string().optional(),
});

// ─── Dialogs ─────────────────────────────────────────────────────────────────

function PermissionsDialog({
  user, open, onOpenChange,
}: { user: SafeUser; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const [selected, setSelected] = useState<string[]>(user.permissions || []);

  const mutation = useMutation({
    mutationFn: async (permissions: string[]) => {
      await apiRequest("PATCH", `/api/users/${user.id}/permissions`, { permissions });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({ title: "Rechten bijgewerkt" });
      onOpenChange(false);
    },
    onError: () => { toast({ title: "Fout bij opslaan", variant: "destructive" }); },
  });

  const toggleModule = (key: string) => {
    setSelected((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);
  };

  const initials = user.fullName?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "??";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Rechten Beheren</DialogTitle></DialogHeader>
        <div className="flex items-center gap-3 mb-4">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary/10 text-primary text-sm">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-sm" data-testid="text-perm-user">{user.fullName}</p>
            <p className="text-xs text-muted-foreground">{user.email} &middot; {user.role}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 mb-3">
          <Button variant="outline" size="sm" onClick={() => setSelected(ALL_MODULES.map((m) => m.key))} data-testid="button-select-all">Alles selecteren</Button>
          <Button variant="outline" size="sm" onClick={() => setSelected([])} data-testid="button-clear-all">Alles wissen</Button>
        </div>
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {ALL_MODULES.map((mod) => (
            <label key={mod.key} className="flex items-center gap-3 p-2 rounded-md hover-elevate cursor-pointer" data-testid={`perm-toggle-${mod.key}`}>
              <Checkbox checked={selected.includes(mod.key)} onCheckedChange={() => toggleModule(mod.key)} />
              <span className="text-sm">{mod.label}</span>
            </label>
          ))}
        </div>
        <Button className="w-full mt-4" onClick={() => mutation.mutate(selected)} disabled={mutation.isPending} data-testid="button-save-permissions">
          <Save className="h-4 w-4 mr-2" />
          {mutation.isPending ? "Opslaan..." : "Rechten Opslaan"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordDialog({
  user, open, onOpenChange,
}: { user: SafeUser; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const mutation = useMutation({
    mutationFn: async (password: string) => {
      await apiRequest("PATCH", `/api/users/${user.id}`, { password });
    },
    onSuccess: () => {
      toast({ title: "Wachtwoord gereset" });
      setNewPassword(""); setConfirmPassword(""); onOpenChange(false);
    },
    onError: () => { toast({ title: "Fout bij resetten", variant: "destructive" }); },
  });

  const handleSave = () => {
    if (!newPassword.trim()) { toast({ title: "Vul een nieuw wachtwoord in", variant: "destructive" }); return; }
    if (newPassword.length < 8) { toast({ title: "Wachtwoord moet minimaal 8 tekens bevatten", variant: "destructive" }); return; }
    if (newPassword !== confirmPassword) { toast({ title: "Wachtwoorden komen niet overeen", variant: "destructive" }); return; }
    mutation.mutate(newPassword);
  };

  const initials = user.fullName?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "??";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>Wachtwoord Resetten</DialogTitle></DialogHeader>
        <div className="flex items-center gap-3 mb-4">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary/10 text-primary text-sm">{initials}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-sm" data-testid="text-reset-user">{user.fullName}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Nieuw wachtwoord</label>
            <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Nieuw wachtwoord" data-testid="input-new-password" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Bevestig wachtwoord</label>
            <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Herhaal wachtwoord" data-testid="input-confirm-password" />
          </div>
        </div>
        <Button className="w-full mt-4" onClick={handleSave} disabled={mutation.isPending} data-testid="button-save-password">
          <KeyRound className="h-4 w-4 mr-2" />
          {mutation.isPending ? "Opslaan..." : "Wachtwoord Resetten"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

// ─── Tab: Rechten ─────────────────────────────────────────────────────────────

function RechtenTab() {
  const [editUser, setEditUser] = useState<SafeUser | null>(null);
  const [resetUser, setResetUser] = useState<SafeUser | null>(null);
  const loginPhotoInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { data: allUsers, isLoading } = useQuery<SafeUser[]>({ queryKey: ["/api/users"] });

  const { data: loginPhoto } = useQuery<{ value: string | null }>({
    queryKey: ["/api/site-settings", "login_photo"],
    queryFn: async () => {
      const res = await fetch("/api/site-settings/login_photo", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
  });

  const uploadLoginPhotoMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("photo", file);
      const res = await fetch("/api/site-settings/login-photo", { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) throw new Error("Upload mislukt");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/site-settings", "login_photo"] });
      toast({ title: "Inlogfoto bijgewerkt", description: "De achtergrondafbeelding van de inlogpagina is gewijzigd." });
    },
    onError: () => { toast({ title: "Fout", description: "Het uploaden van de foto is mislukt.", variant: "destructive" }); },
  });

  const roleLabels: Record<string, string> = {
    directeur: "Directeur", admin: "Beheerder", manager: "Manager", employee: "Medewerker",
  };
  const roleBadgeVariant = (role: string) => {
    if (role === "directeur" || role === "admin") return "default" as const;
    if (role === "manager") return "secondary" as const;
    return "outline" as const;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {editUser && (
        <PermissionsDialog user={editUser} open={!!editUser} onOpenChange={(open) => { if (!open) setEditUser(null); }} />
      )}
      {resetUser && (
        <ResetPasswordDialog user={resetUser} open={!!resetUser} onOpenChange={(open) => { if (!open) setResetUser(null); }} />
      )}

      <Card>
        <CardHeader className="flex flex-row items-center gap-2 pb-3">
          <Users className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Gebruikers & Rechten</h3>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            {allUsers?.map((u) => {
              const initials = u.fullName?.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "??";
              const permCount = u.permissions?.length || 0;
              return (
                <div key={u.id} className="flex items-center gap-3 p-3 rounded-md hover-elevate" data-testid={`user-row-${u.id}`}>
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium" data-testid={`text-user-name-${u.id}`}>{u.fullName}</span>
                      <Badge variant={roleBadgeVariant(u.role)} className="text-xs">{roleLabels[u.role] || u.role}</Badge>
                      {!u.active && <Badge variant="outline" className="text-xs">Inactief</Badge>}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs text-muted-foreground">{u.department || "Geen afdeling"}</span>
                      <span className="text-xs text-muted-foreground">&middot;</span>
                      <span className="text-xs text-muted-foreground">{permCount} module{permCount !== 1 ? "s" : ""} toegang</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="hidden sm:flex gap-1 flex-wrap">
                      {u.permissions?.slice(0, 4).map((p) => (
                        <Badge key={p} variant="outline" className="text-xs">{p}</Badge>
                      ))}
                      {(u.permissions?.length || 0) > 4 && (
                        <Badge variant="outline" className="text-xs">+{(u.permissions?.length || 0) - 4}</Badge>
                      )}
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setResetUser(u)} data-testid={`button-reset-pw-${u.id}`}>
                      <KeyRound className="h-4 w-4 mr-1" />Wachtwoord
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setEditUser(u)} data-testid={`button-edit-perms-${u.id}`}>
                      <Shield className="h-4 w-4 mr-1" />Rechten
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2 pb-3">
          <ImageIcon className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Inlogpagina Achtergrondafbeelding</h3>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center gap-4">
            <div className="relative w-48 h-28 rounded-lg overflow-hidden border border-border bg-muted shrink-0">
              <img src={loginPhoto?.value || "/images/login-hero.jpg"} alt="Inlogpagina achtergrond" className="w-full h-full object-cover" data-testid="img-login-photo-preview" />
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Deze afbeelding wordt getoond als achtergrond op de inlogpagina.</p>
              <input ref={loginPhotoInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadLoginPhotoMutation.mutate(f); }} data-testid="input-login-photo" />
              <Button variant="outline" size="sm" className="gap-2" onClick={() => loginPhotoInputRef.current?.click()} disabled={uploadLoginPhotoMutation.isPending} data-testid="button-change-login-photo">
                <Camera className="h-4 w-4" />
                {uploadLoginPhotoMutation.isPending ? "Uploaden..." : "Foto wijzigen"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tab: Onderhoud Afdelingen ────────────────────────────────────────────────

function AfdelingenTab() {
  const [open, setOpen] = useState(false);
  const [editDept, setEditDept] = useState<Department | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: departments, isLoading } = useQuery<Department[]>({ queryKey: ["/api/departments"] });
  const { data: users } = useQuery<User[]>({ queryKey: ["/api/users"] });

  const form = useForm<z.infer<typeof departmentFormSchema>>({
    resolver: zodResolver(departmentFormSchema),
    defaultValues: { name: "", description: "" },
  });

  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof departmentFormSchema>) => {
      await apiRequest("POST", "/api/departments", { ...data, description: data.description || null, managerId: null });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
      toast({ title: "Afdeling aangemaakt" });
      setOpen(false); form.reset();
    },
    onError: () => { toast({ title: "Fout bij aanmaken", variant: "destructive" }); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/departments/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
      toast({ title: "Afdeling verwijderd" });
    },
  });

  const editForm = useForm<z.infer<typeof departmentFormSchema>>({
    resolver: zodResolver(departmentFormSchema),
    defaultValues: { name: "", description: "" },
  });

  const editMutation = useMutation({
    mutationFn: async (data: z.infer<typeof departmentFormSchema> & { id: string }) => {
      await apiRequest("PATCH", `/api/departments/${data.id}`, { name: data.name, description: data.description || null });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/departments"] });
      toast({ title: "Afdeling bijgewerkt" });
      setEditDept(null);
    },
    onError: () => { toast({ title: "Fout bij bijwerken", variant: "destructive" }); },
  });

  const openEdit = (dept: Department) => {
    editForm.reset({ name: dept.name, description: dept.description || "" });
    setEditDept(dept);
  };

  const getMemberCount = (deptName: string) => users?.filter((u) => u.department === deptName).length || 0;
  const getManager = (managerId: string | null) => {
    if (!managerId || !users) return null;
    return users.find((u) => u.id === managerId);
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-36" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {isAdminRole(user?.role) && (
        <div className="flex justify-end">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-department">
                <Plus className="h-4 w-4 mr-2" />Nieuwe Afdeling
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Nieuwe Afdeling</DialogTitle></DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Naam</FormLabel>
                      <FormControl><Input {...field} data-testid="input-department-name" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Beschrijving</FormLabel>
                      <FormControl><Textarea {...field} data-testid="input-department-description" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-department">
                    {createMutation.isPending ? "Opslaan..." : "Afdeling Opslaan"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {(!departments || departments.length === 0) ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Geen afdelingen gevonden</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {departments.map((dept) => {
            const memberCount = getMemberCount(dept.name);
            const manager = getManager(dept.managerId);
            return (
              <Card key={dept.id} className="hover-elevate">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm" data-testid={`text-department-${dept.id}`}>{dept.name}</h3>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <Users className="h-3 w-3" />
                          {memberCount} {memberCount === 1 ? "medewerker" : "medewerkers"}
                        </div>
                      </div>
                    </div>
                    {isAdminRole(user?.role) && (
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(dept)} data-testid={`button-edit-department-${dept.id}`}>
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(dept.id)} data-testid={`button-delete-department-${dept.id}`}>
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    )}
                  </div>
                  {dept.description && (
                    <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{dept.description}</p>
                  )}
                  {manager && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs text-muted-foreground">Manager: <span className="font-medium text-foreground">{manager.fullName}</span></p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!editDept} onOpenChange={(v) => { if (!v) setEditDept(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Afdeling Bewerken</DialogTitle></DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit((d) => editDept && editMutation.mutate({ ...d, id: editDept.id }))} className="space-y-4">
              <FormField control={editForm.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Naam</FormLabel>
                  <FormControl><Input {...field} data-testid="input-edit-department-name" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={editForm.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Beschrijving</FormLabel>
                  <FormControl><Textarea {...field} data-testid="input-edit-department-description" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <Button type="submit" className="w-full" disabled={editMutation.isPending} data-testid="button-submit-edit-department">
                {editMutation.isPending ? "Opslaan..." : "Wijzigingen Opslaan"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Tab: Onderhoud Functies ──────────────────────────────────────────────────

function FunctiesTab() {
  const [open, setOpen] = useState(false);
  const [editFunc, setEditFunc] = useState<JobFunction | null>(null);
  const { toast } = useToast();

  const { data: jobFunctionList, isLoading } = useQuery<JobFunction[]>({ queryKey: ["/api/job-functions"] });

  const form = useForm<z.infer<typeof jobFunctionFormSchema>>({
    resolver: zodResolver(jobFunctionFormSchema),
    defaultValues: { name: "", description: "" },
  });

  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof jobFunctionFormSchema>) => {
      await apiRequest("POST", "/api/job-functions", { name: data.name, description: data.description || null });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/job-functions"] });
      toast({ title: "Functie aangemaakt" });
      setOpen(false); form.reset();
    },
    onError: () => { toast({ title: "Fout bij aanmaken", variant: "destructive" }); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { await apiRequest("DELETE", `/api/job-functions/${id}`); },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/job-functions"] });
      toast({ title: "Functie verwijderd" });
    },
  });

  const editForm = useForm<z.infer<typeof jobFunctionFormSchema>>({
    resolver: zodResolver(jobFunctionFormSchema),
    defaultValues: { name: "", description: "" },
  });

  const editMutation = useMutation({
    mutationFn: async (data: z.infer<typeof jobFunctionFormSchema> & { id: string }) => {
      await apiRequest("PATCH", `/api/job-functions/${data.id}`, { name: data.name, description: data.description || null });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/job-functions"] });
      toast({ title: "Functie bijgewerkt" });
      setEditFunc(null);
    },
    onError: () => { toast({ title: "Fout bij bijwerken", variant: "destructive" }); },
  });

  const openEdit = (func: JobFunction) => {
    editForm.reset({ name: func.name, description: func.description || "" });
    setEditFunc(func);
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-job-function">
              <Plus className="h-4 w-4 mr-2" />Nieuwe Functie
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nieuwe Functie</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Naam</FormLabel>
                    <FormControl><Input {...field} placeholder="Bijv. HR Medewerker" data-testid="input-job-function-name" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Beschrijving (optioneel)</FormLabel>
                    <FormControl><Textarea {...field} data-testid="input-job-function-description" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-job-function">
                  {createMutation.isPending ? "Opslaan..." : "Functie Opslaan"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {(!jobFunctionList || jobFunctionList.length === 0) ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Geen functies gevonden</p>
            <p className="text-sm text-muted-foreground mt-1">Voeg functies toe om ze beschikbaar te maken in medewerkersprofielen.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {jobFunctionList.map((func) => (
            <Card key={func.id} className="hover-elevate">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <Briefcase className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm" data-testid={`text-job-function-${func.id}`}>{func.name}</h3>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(func)} data-testid={`button-edit-job-function-${func.id}`}>
                      <Pencil className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(func.id)} data-testid={`button-delete-job-function-${func.id}`}>
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
                {func.description && (
                  <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{func.description}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editFunc} onOpenChange={(v) => { if (!v) setEditFunc(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Functie Bewerken</DialogTitle></DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit((d) => editFunc && editMutation.mutate({ ...d, id: editFunc.id }))} className="space-y-4">
              <FormField control={editForm.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Naam</FormLabel>
                  <FormControl><Input {...field} data-testid="input-edit-job-function-name" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={editForm.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Beschrijving (optioneel)</FormLabel>
                  <FormControl><Textarea {...field} data-testid="input-edit-job-function-description" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <Button type="submit" className="w-full" disabled={editMutation.isPending} data-testid="button-submit-edit-job-function">
                {editMutation.isPending ? "Opslaan..." : "Wijzigingen Opslaan"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function BeheerPage() {
  const [activeTab, setActiveTab] = useState("rechten");

  const tabs = [
    { key: "rechten", label: "Rechten", icon: Shield },
    { key: "afdelingen", label: "Onderhoud Afdelingen", icon: Building2 },
    { key: "functies", label: "Onderhoud Functies", icon: Briefcase },
  ];

  return (
    <div className="overflow-auto h-full">
      <PageHero
        title="Beheer"
        subtitle="Beheer gebruikersrechten, afdelingen en functies"
        imageSrc="/uploads/App_pics/beheer.png"
        imageAlt="beheer"
      />
      <div className="p-6 space-y-6">
        <div className="flex gap-1 border-b overflow-x-auto" data-testid="tabs-beheer">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.key
                    ? "border-primary text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
                data-testid={`tab-${tab.key}`}
              >
                <Icon className="h-4 w-4 inline mr-1.5 -mt-0.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="mt-4">
          {activeTab === "rechten" && <RechtenTab />}
          {activeTab === "afdelingen" && <AfdelingenTab />}
          {activeTab === "functies" && <FunctiesTab />}
        </div>
      </div>
    </div>
  );
}
