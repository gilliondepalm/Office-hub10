import { useLocation, Link } from "wouter";
import {
  LayoutDashboard,
  CalendarDays,
  Megaphone,
  Building2,
  Users,
  Clock,
  AppWindow,
  LogOut,
  Shield,
  UserCircle,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

const menuItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, key: "dashboard" },
  { title: "Kalender", url: "/kalender", icon: CalendarDays, key: "kalender" },
  { title: "Aankondigingen", url: "/aankondigingen", icon: Megaphone, key: "aankondigingen" },
  { title: "Organisatie", url: "/organisatie", icon: Building2, key: "organisatie" },
  { title: "Personalia", url: "/personalia", icon: Users, key: "personalia" },
  { title: "Verzuim", url: "/verzuim", icon: Clock, key: "verzuim" },
  { title: "Applicaties", url: "/applicaties", icon: AppWindow, key: "applicaties" },
  { title: "Beheer", url: "/beheer", icon: Shield, key: "beheer" },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  const userPermissions = user?.permissions || [];
  const visibleItems = menuItems.filter((item) => userPermissions.includes(item.key));

  const initials = user?.fullName
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "??";

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-sm">
            KD
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">Kantoor Dashboard</span>
            <span className="text-xs text-muted-foreground">
              {user?.role === "admin" ? "Beheerportaal" : "Medewerkersportaal"}
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigatie</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.map((item) => {
                const isActive = location === item.url || (item.url !== "/" && location.startsWith(item.url));
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.url} data-testid={`nav-${item.url.replace("/", "") || "dashboard"}`}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <div className="space-y-2">
          <Link href="/profiel" data-testid="nav-profiel">
            <div className={`flex items-center gap-3 p-2 rounded-md cursor-pointer hover-elevate ${location === "/profiel" ? "bg-sidebar-accent" : ""}`}>
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="text-sm font-medium truncate">{user?.fullName}</span>
                <span className="text-xs text-muted-foreground capitalize">{user?.role === "admin" ? "Beheerder" : user?.role === "manager" ? "Manager" : "Medewerker"}</span>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); logout(); }}
                data-testid="button-logout"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </Link>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
