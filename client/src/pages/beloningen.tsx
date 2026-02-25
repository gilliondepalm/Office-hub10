import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
import { Plus, Award, Star, TrendingUp, ClipboardCheck, UserCheck, Gift } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import type { Reward, User } from "@shared/schema";
import { useAuth } from "@/lib/auth";

const rewardFormSchema = z.object({
  userId: z.string().min(1, "Selecteer een medewerker"),
  points: z.coerce.number().min(1, "Minimaal 1 punt"),
  reason: z.string().min(1, "Reden is verplicht"),
});

export default function BeloningenPage() {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("functionering");
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: rewards, isLoading } = useQuery<(Reward & { userName?: string })[]>({
    queryKey: ["/api/rewards"],
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  const { data: leaderboard } = useQuery<{ userId: string; userName: string; totalPoints: number }[]>({
    queryKey: ["/api/rewards/leaderboard"],
  });

  const form = useForm<z.infer<typeof rewardFormSchema>>({
    resolver: zodResolver(rewardFormSchema),
    defaultValues: { userId: "", points: 10, reason: "" },
  });

  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof rewardFormSchema>) => {
      await apiRequest("POST", "/api/rewards", {
        ...data,
        awardedBy: user?.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rewards"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rewards/leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({ title: "Beloning toegekend" });
      setOpen(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Fout bij toekennen", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4 overflow-auto h-full">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-beloningen-title">Beloningen</h1>
          <p className="text-muted-foreground text-sm">Functionering, beoordeling en beloningsysteem</p>
        </div>
        {activeTab === "beloningsysteem" && (user?.role === "admin" || user?.role === "manager") && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-reward">
                <Plus className="h-4 w-4 mr-2" />
                Punten Toekennen
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Punten Toekennen</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
                  <FormField control={form.control} name="userId" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Medewerker</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-reward-user"><SelectValue placeholder="Selecteer medewerker" /></SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {users?.map((u) => (
                            <SelectItem key={u.id} value={u.id}>{u.fullName}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="points" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Punten</FormLabel>
                      <FormControl><Input type="number" {...field} min={1} data-testid="input-reward-points" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="reason" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Reden</FormLabel>
                      <FormControl><Input {...field} data-testid="input-reward-reason" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <Button type="submit" className="w-full" disabled={createMutation.isPending} data-testid="button-submit-reward">
                    {createMutation.isPending ? "Toekennen..." : "Punten Toekennen"}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="flex gap-1 border-b">
        <button
          onClick={() => setActiveTab("functionering")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "functionering"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          data-testid="tab-functionering"
        >
          <ClipboardCheck className="h-4 w-4 inline mr-1.5 -mt-0.5" />
          Functionering
        </button>
        <button
          onClick={() => setActiveTab("beoordeling")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "beoordeling"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          data-testid="tab-beoordeling"
        >
          <UserCheck className="h-4 w-4 inline mr-1.5 -mt-0.5" />
          Beoordeling
        </button>
        <button
          onClick={() => setActiveTab("beloningsysteem")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "beloningsysteem"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          data-testid="tab-beloningsysteem"
        >
          <Gift className="h-4 w-4 inline mr-1.5 -mt-0.5" />
          Beloningsysteem
        </button>
      </div>

      {activeTab === "functionering" && (
        <Card>
          <CardContent className="flex flex-col items-center py-10">
            <ClipboardCheck className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground text-sm">Functioneringsgesprekken — binnenkort beschikbaar</p>
          </CardContent>
        </Card>
      )}

      {activeTab === "beoordeling" && (
        <Card>
          <CardContent className="flex flex-col items-center py-10">
            <UserCheck className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-muted-foreground text-sm">Beoordelingen — binnenkort beschikbaar</p>
          </CardContent>
        </Card>
      )}

      {activeTab === "beloningsysteem" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center gap-2 pb-3">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold text-sm">Ranglijst</h3>
            </CardHeader>
            <CardContent className="pt-0">
              {(!leaderboard || leaderboard.length === 0) ? (
                <p className="text-sm text-muted-foreground text-center py-6">Nog geen punten toegekend</p>
              ) : (
                <div className="space-y-3">
                  {leaderboard.map((entry, i) => {
                    const initials = entry.userName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
                    return (
                      <div key={entry.userId} className="flex items-center gap-3 p-2 rounded-md hover-elevate" data-testid={`leaderboard-${entry.userId}`}>
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          i === 0 ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                          : i === 1 ? "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                          : i === 2 ? "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
                          : "bg-muted text-muted-foreground"
                        }`}>
                          {i + 1}
                        </div>
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs bg-primary/10 text-primary">{initials}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{entry.userName}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 text-yellow-500" />
                          <span className="text-sm font-bold">{entry.totalPoints}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center gap-2 pb-3">
              <Award className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold text-sm">Recente Beloningen</h3>
            </CardHeader>
            <CardContent className="pt-0">
              {(!rewards || rewards.length === 0) ? (
                <p className="text-sm text-muted-foreground text-center py-6">Nog geen beloningen</p>
              ) : (
                <div className="space-y-3">
                  {rewards.slice(0, 10).map((reward) => (
                    <div key={reward.id} className="flex items-start gap-3 p-2 rounded-md hover-elevate" data-testid={`reward-item-${reward.id}`}>
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                        <Award className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium">{(reward as any).userName || "Medewerker"}</p>
                          <Badge variant="secondary" className="text-xs gap-1">
                            <Star className="h-3 w-3" /> +{reward.points}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{reward.reason}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(reward.awardedAt), "d MMM yyyy", { locale: nl })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
