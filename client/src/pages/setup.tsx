import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Building2, Shield, CheckCircle2 } from "lucide-react";

export default function SetupPage({ onComplete }: { onComplete: () => void }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [form, setForm] = useState({
    username: "",
    password: "",
    confirmPassword: "",
    fullName: "",
    email: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.username || !form.password || !form.fullName || !form.email) {
      toast({ title: "Alle velden zijn verplicht", variant: "destructive" });
      return;
    }
    if (form.password.length < 8) {
      toast({ title: "Wachtwoord moet minimaal 8 tekens bevatten", variant: "destructive" });
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast({ title: "Wachtwoorden komen niet overeen", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/setup/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: form.username,
          password: form.password,
          fullName: form.fullName,
          email: form.email,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast({ title: data.message || "Setup mislukt", variant: "destructive" });
        return;
      }
      setDone(true);
    } catch {
      toast({ title: "Er is een fout opgetreden", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-8 pb-6 px-8">
          {!done ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="text-center space-y-2 mb-6">
                <div className="flex justify-center">
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <Shield className="h-7 w-7 text-primary" />
                  </div>
                </div>
                <h1 className="text-2xl font-bold tracking-tight">Eerste installatie</h1>
                <p className="text-muted-foreground text-sm">
                  Maak een beheerdersaccount aan om het portaal te configureren.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Volledige naam</label>
                <Input
                  value={form.fullName}
                  onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                  placeholder="bijv. Jan de Vries"
                  data-testid="input-setup-fullname"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">E-mailadres</label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="jan@bedrijf.nl"
                  data-testid="input-setup-email"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Gebruikersnaam</label>
                <Input
                  value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  placeholder="admin"
                  data-testid="input-setup-username"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Wachtwoord (minimaal 8 tekens)</label>
                <Input
                  type="password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Sterk wachtwoord"
                  data-testid="input-setup-password"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Bevestig wachtwoord</label>
                <Input
                  type="password"
                  value={form.confirmPassword}
                  onChange={e => setForm(f => ({ ...f, confirmPassword: e.target.value }))}
                  placeholder="Herhaal wachtwoord"
                  data-testid="input-setup-confirm-password"
                />
              </div>
              <Button
                type="submit"
                className="w-full h-11 font-semibold text-sm"
                disabled={loading}
                data-testid="button-setup-submit"
              >
                {loading ? "Aanmaken..." : "Beheerder aanmaken"}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                <Building2 className="inline h-3 w-3 mr-1" />
                GDP &copy; ir. G.G. de Palm
              </p>
            </form>
          ) : (
            <div className="space-y-5 text-center">
              <CheckCircle2 className="h-14 w-14 text-green-500 mx-auto" />
              <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tight">Setup voltooid</h2>
                <p className="text-muted-foreground text-sm">
                  Uw beheerdersaccount is aangemaakt. U kunt nu inloggen.
                </p>
              </div>
              <Button
                className="w-full h-11 font-semibold text-sm"
                onClick={onComplete}
                data-testid="button-setup-to-login"
              >
                Naar inlogpagina
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
