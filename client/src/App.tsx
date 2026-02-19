import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthProvider, useAuth } from "@/lib/auth";
import { Skeleton } from "@/components/ui/skeleton";
import NotFound from "@/pages/not-found";
import LoginPage from "@/pages/login";
import DashboardPage from "@/pages/dashboard";
import KalenderPage from "@/pages/kalender";
import AankondigingenPage from "@/pages/aankondigingen";
import OrganisatiePage from "@/pages/organisatie";
import PersonaliaPage from "@/pages/personalia";
import VerzuimPage from "@/pages/verzuim";
import ApplicatiesPage from "@/pages/applicaties";
import BeheerPage from "@/pages/beheer";
import ProfielPage from "@/pages/profiel";

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
      {perms.includes("applicaties") && <Route path="/applicaties" component={ApplicatiesPage} />}
      {perms.includes("beheer") && <Route path="/beheer" component={BeheerPage} />}
      <Route path="/profiel" component={ProfielPage} />
      <Route path="/" component={DashboardPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AuthenticatedApp() {
  const { user, loading } = useAuth();

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

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between gap-4 p-3 border-b sticky top-0 z-50 bg-background">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-hidden">
            <Router />
          </main>
        </div>
      </div>
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
