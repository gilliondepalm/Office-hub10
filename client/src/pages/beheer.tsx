import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Avatar, AvatarFallback,
} from "@/components/ui/avatar";
import { Shield, Settings, Save, Users } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@shared/schema";

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

function PermissionsDialog({
  user,
  open,
  onOpenChange,
}: {
  user: SafeUser;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
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
    onError: () => {
      toast({ title: "Fout bij opslaan", variant: "destructive" });
    },
  });

  const toggleModule = (key: string) => {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const selectAll = () => setSelected(ALL_MODULES.map((m) => m.key));
  const clearAll = () => setSelected([]);

  const initials = user.fullName
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "??";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Rechten Beheren</DialogTitle>
        </DialogHeader>
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
          <Button variant="outline" size="sm" onClick={selectAll} data-testid="button-select-all">Alles selecteren</Button>
          <Button variant="outline" size="sm" onClick={clearAll} data-testid="button-clear-all">Alles wissen</Button>
        </div>
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {ALL_MODULES.map((mod) => (
            <label
              key={mod.key}
              className="flex items-center gap-3 p-2 rounded-md hover-elevate cursor-pointer"
              data-testid={`perm-toggle-${mod.key}`}
            >
              <Checkbox
                checked={selected.includes(mod.key)}
                onCheckedChange={() => toggleModule(mod.key)}
              />
              <span className="text-sm">{mod.label}</span>
            </label>
          ))}
        </div>
        <Button
          className="w-full mt-4"
          onClick={() => mutation.mutate(selected)}
          disabled={mutation.isPending}
          data-testid="button-save-permissions"
        >
          <Save className="h-4 w-4 mr-2" />
          {mutation.isPending ? "Opslaan..." : "Rechten Opslaan"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

export default function BeheerPage() {
  const [editUser, setEditUser] = useState<SafeUser | null>(null);

  const { data: allUsers, isLoading } = useQuery<SafeUser[]>({
    queryKey: ["/api/users"],
  });

  const roleLabels: Record<string, string> = {
    admin: "Beheerder",
    manager: "Manager",
    employee: "Medewerker",
  };

  const roleBadgeVariant = (role: string) => {
    if (role === "admin") return "default" as const;
    if (role === "manager") return "secondary" as const;
    return "outline" as const;
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 overflow-auto h-full">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-beheer-title">Beheer</h1>
        <p className="text-muted-foreground text-sm">Beheer gebruikersrechten en toegang tot modules</p>
      </div>

      {editUser && (
        <PermissionsDialog
          user={editUser}
          open={!!editUser}
          onOpenChange={(open) => { if (!open) setEditUser(null); }}
        />
      )}

      <Card>
        <CardHeader className="flex flex-row items-center gap-2 pb-3">
          <Users className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Gebruikers & Rechten</h3>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            {allUsers?.map((u) => {
              const initials = u.fullName
                ?.split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2) || "??";
              const permCount = u.permissions?.length || 0;

              return (
                <div
                  key={u.id}
                  className="flex items-center gap-3 p-3 rounded-md hover-elevate"
                  data-testid={`user-row-${u.id}`}
                >
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium" data-testid={`text-user-name-${u.id}`}>{u.fullName}</span>
                      <Badge variant={roleBadgeVariant(u.role)} className="text-xs">
                        {roleLabels[u.role] || u.role}
                      </Badge>
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditUser(u)}
                      data-testid={`button-edit-perms-${u.id}`}
                    >
                      <Shield className="h-4 w-4 mr-1" />
                      Rechten
                    </Button>
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
