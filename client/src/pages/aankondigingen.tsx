import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Plus, Megaphone, Pin, Trash2, AlertCircle, Pencil, FileText, Upload, X, Send, Mail, MailOpen, Reply, Clock, User as UserIcon, Newspaper } from "lucide-react";
import { apiRequest, queryClient, fetchCsrfToken } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { nl } from "date-fns/locale";
import type { Announcement, Message, User } from "@shared/schema";
import { useAuth } from "@/lib/auth";
import { isAdminRole } from "@shared/schema";

const announcementFormSchema = z.object({
  title: z.string().min(1, "Titel is verplicht"),
  content: z.string().min(1, "Inhoud is verplicht"),
  priority: z.string().default("normal"),
  pinned: z.boolean().default(false),
});

const messageFormSchema = z.object({
  toUserId: z.string().min(1, "Selecteer een medewerker"),
  subject: z.string().min(1, "Onderwerp is verplicht"),
  content: z.string().min(1, "Bericht is verplicht"),
});

function AnnouncementFormDialog({
  open,
  onOpenChange,
  editAnn,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editAnn?: Announcement | null;
}) {
  const { toast } = useToast();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfRemoved, setPdfRemoved] = useState(false);
  const [uploading, setUploading] = useState(false);

  const existingPdf = !pdfRemoved && !pdfFile ? (editAnn?.pdfUrl || null) : null;

  const form = useForm<z.infer<typeof announcementFormSchema>>({
    resolver: zodResolver(announcementFormSchema),
    defaultValues: {
      title: editAnn?.title || "",
      content: editAnn?.content || "",
      priority: editAnn?.priority || "normal",
      pinned: editAnn?.pinned || false,
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof announcementFormSchema>) => {
      let pdfUrl: string | null = existingPdf;

      if (pdfFile) {
        setUploading(true);
        const formData = new FormData();
        formData.append("pdf", pdfFile);
        const csrfToken = await fetchCsrfToken();
        const uploadRes = await fetch("/api/upload/pdf", {
          method: "POST",
          body: formData,
          credentials: "include",
          headers: { "X-CSRF-Token": csrfToken },
        });
        if (!uploadRes.ok) {
          throw new Error("PDF upload mislukt");
        }
        const uploadData = await uploadRes.json();
        pdfUrl = uploadData.pdfUrl;
        setUploading(false);
      }

      const payload = { ...data, pdfUrl };

      if (editAnn) {
        await apiRequest("PATCH", `/api/announcements/${editAnn.id}`, payload);
      } else {
        await apiRequest("POST", "/api/announcements", {
          ...payload,
          createdBy: user?.id || null,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/announcements"] });
      toast({ title: editAnn ? "Aankondiging bijgewerkt" : "Aankondiging geplaatst" });
      onOpenChange(false);
      form.reset();
      setPdfFile(null);
      setPdfRemoved(false);
    },
    onError: () => {
      setUploading(false);
      toast({ title: "Fout bij opslaan", variant: "destructive" });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "application/pdf") {
        toast({ title: "Alleen PDF-bestanden zijn toegestaan", variant: "destructive" });
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: "Bestand is te groot (max 10 MB)", variant: "destructive" });
        return;
      }
      setPdfFile(file);
      setPdfRemoved(false);
    }
  };

  const removePdf = () => {
    setPdfFile(null);
    setPdfRemoved(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => {
      if (!o) {
        setPdfFile(null);
        setPdfRemoved(false);
      }
      onOpenChange(o);
    }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editAnn ? "Aankondiging Bewerken" : "Nieuwe Aankondiging"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem>
                <FormLabel>Titel</FormLabel>
                <FormControl><Input {...field} data-testid="input-announcement-title" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="content" render={({ field }) => (
              <FormItem>
                <FormLabel>Inhoud</FormLabel>
                <FormControl><Textarea {...field} rows={4} data-testid="input-announcement-content" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="priority" render={({ field }) => (
              <FormItem>
                <FormLabel>Prioriteit</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-announcement-priority"><SelectValue /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="low">Laag</SelectItem>
                    <SelectItem value="normal">Normaal</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">Hoog</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="pinned" render={({ field }) => (
              <FormItem className="flex items-center gap-3">
                <FormLabel className="mt-0">Vastzetten</FormLabel>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-announcement-pinned" />
                </FormControl>
              </FormItem>
            )} />

            <div>
              <p className="text-sm font-medium mb-2">PDF-bijlage</p>
              {pdfFile ? (
                <div className="flex items-center gap-2 p-2 rounded-md bg-muted">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm truncate flex-1">{pdfFile.name}</span>
                  <Button type="button" size="icon" variant="ghost" onClick={removePdf} data-testid="button-remove-pdf">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : existingPdf ? (
                <div className="flex items-center gap-2 p-2 rounded-md bg-muted">
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm truncate flex-1">Bestaand PDF-bestand</span>
                  <Button type="button" size="icon" variant="ghost" onClick={removePdf} data-testid="button-remove-pdf">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="button-upload-pdf"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  PDF uploaden
                </Button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={handleFileChange}
                data-testid="input-pdf-file"
              />
              <p className="text-xs text-muted-foreground mt-1">Max 10 MB, alleen PDF-bestanden</p>
            </div>

            <Button type="submit" className="w-full" disabled={mutation.isPending || uploading} data-testid="button-submit-announcement">
              {uploading ? "PDF uploaden..." : mutation.isPending ? "Opslaan..." : editAnn ? "Bijwerken" : "Aankondiging Plaatsen"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

type MessageWithNames = Message & { fromUserName?: string; toUserName?: string };

function SendMessageDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const { data: allUsers } = useQuery<User[]>({ queryKey: ["/api/users"] });

  const form = useForm<z.infer<typeof messageFormSchema>>({
    resolver: zodResolver(messageFormSchema),
    defaultValues: { toUserId: "", subject: "", content: "" },
  });

  const mutation = useMutation({
    mutationFn: async (data: z.infer<typeof messageFormSchema>) => {
      await apiRequest("POST", "/api/messages", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      toast({ title: "Bericht verzonden" });
      onOpenChange(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Fout bij verzenden", variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Bericht Sturen</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((d) => mutation.mutate(d))} className="space-y-4">
            <FormField control={form.control} name="toUserId" render={({ field }) => (
              <FormItem>
                <FormLabel>Aan medewerker</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-message-recipient"><SelectValue placeholder="Selecteer medewerker" /></SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {(allUsers || []).filter(u => u.active).map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.fullName} ({u.role})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="subject" render={({ field }) => (
              <FormItem>
                <FormLabel>Onderwerp</FormLabel>
                <FormControl><Input {...field} data-testid="input-message-subject" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="content" render={({ field }) => (
              <FormItem>
                <FormLabel>Bericht</FormLabel>
                <FormControl><Textarea {...field} rows={4} data-testid="input-message-content" /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <Button type="submit" className="w-full" disabled={mutation.isPending} data-testid="button-send-message">
              <Send className="h-4 w-4 mr-2" />
              {mutation.isPending ? "Verzenden..." : "Bericht Verzenden"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function MessageDetailDialog({
  message,
  onClose,
  currentUserId,
}: {
  message: MessageWithNames | null;
  onClose: () => void;
  currentUserId: string;
}) {
  const { toast } = useToast();
  const [replyText, setReplyText] = useState("");

  const isRecipient = message?.toUserId === currentUserId;
  const canReply = isRecipient && !message?.reply;

  const readMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("PATCH", `/api/messages/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
    },
  });

  const replyMutation = useMutation({
    mutationFn: async () => {
      if (!message) return;
      await apiRequest("PATCH", `/api/messages/${message.id}/reply`, { reply: replyText });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/messages"] });
      toast({ title: "Reactie verzonden" });
      setReplyText("");
      onClose();
    },
    onError: () => {
      toast({ title: "Fout bij reageren", variant: "destructive" });
    },
  });

  useEffect(() => {
    if (message && isRecipient && !message.read) {
      readMutation.mutate(message.id);
    }
  }, [message?.id]);

  return (
    <Dialog open={!!message} onOpenChange={(o) => { if (!o) { setReplyText(""); onClose(); } }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            {message?.subject}
          </DialogTitle>
        </DialogHeader>
        {message && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <UserIcon className="h-4 w-4" />
              <span>Van: <span className="font-medium text-foreground">{message.fromUserName}</span></span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <UserIcon className="h-4 w-4" />
              <span>Aan: <span className="font-medium text-foreground">{message.toUserName}</span></span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{format(new Date(message.createdAt), "d MMMM yyyy 'om' HH:mm", { locale: nl })}</span>
            </div>

            <div className="rounded-md bg-muted p-4">
              <p className="text-sm whitespace-pre-wrap" data-testid="text-message-content">{message.content}</p>
            </div>

            {message.reply && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Reply className="h-4 w-4" />
                  Reactie van {message.toUserName}
                </div>
                <div className="rounded-md bg-muted p-4 border-l-2 border-primary">
                  <p className="text-sm whitespace-pre-wrap" data-testid="text-message-reply">{message.reply}</p>
                  {message.repliedAt && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {format(new Date(message.repliedAt), "d MMMM yyyy 'om' HH:mm", { locale: nl })}
                    </p>
                  )}
                </div>
              </div>
            )}

            {canReply && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Uw reactie</label>
                <Textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={3}
                  placeholder="Typ uw reactie..."
                  data-testid="input-message-reply"
                />
                <Button
                  onClick={() => replyMutation.mutate()}
                  disabled={!replyText.trim() || replyMutation.isPending}
                  className="w-full"
                  data-testid="button-submit-reply"
                >
                  <Reply className="h-4 w-4 mr-2" />
                  {replyMutation.isPending ? "Verzenden..." : "Reactie Verzenden"}
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function AankondigingenPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editAnn, setEditAnn] = useState<Announcement | null>(null);
  const [sendMsgOpen, setSendMsgOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<MessageWithNames | null>(null);
  const [activeTab, setActiveTab] = useState<"announcements" | "messages" | "nieuwsbrieven">("announcements");
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: announcements, isLoading } = useQuery<Announcement[]>({
    queryKey: ["/api/announcements"],
  });

  const { data: messagesData, isLoading: messagesLoading } = useQuery<MessageWithNames[]>({
    queryKey: ["/api/messages"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/announcements/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/announcements"] });
      toast({ title: "Aankondiging verwijderd" });
    },
  });

  const sorted = [...(announcements || [])].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const unreadCount = (messagesData || []).filter(m => m.toUserId === user?.id && !m.read).length;

  const isAdminOrManager = isAdminRole(user?.role) || user?.role === "manager";

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 overflow-auto h-full">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-announcements-title">Aankondigingen</h1>
          <p className="text-muted-foreground text-sm">Belangrijke mededelingen en berichten</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {isAdminOrManager && activeTab === "messages" && (
            <Button onClick={() => setSendMsgOpen(true)} data-testid="button-send-message-open">
              <Send className="h-4 w-4 mr-2" />
              Bericht Sturen
            </Button>
          )}
          {isAdminOrManager && activeTab === "announcements" && (
            <Button onClick={() => setCreateOpen(true)} data-testid="button-add-announcement">
              <Plus className="h-4 w-4 mr-2" />
              Nieuwe Aankondiging
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-1 border-b">
        <button
          onClick={() => setActiveTab("announcements")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "announcements"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          data-testid="tab-announcements"
        >
          <Megaphone className="h-4 w-4 inline mr-1.5 -mt-0.5" />
          Aankondigingen
        </button>
        <button
          onClick={() => setActiveTab("messages")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === "messages"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          data-testid="tab-messages"
        >
          <Mail className="h-4 w-4 inline -mt-0.5" />
          Berichten
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-xs px-1.5 py-0 min-w-[1.25rem] h-5 flex items-center justify-center" data-testid="badge-unread-count">
              {unreadCount}
            </Badge>
          )}
        </button>
        <button
          onClick={() => setActiveTab("nieuwsbrieven")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "nieuwsbrieven"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
          data-testid="tab-nieuwsbrieven"
        >
          <Newspaper className="h-4 w-4 inline mr-1.5 -mt-0.5" />
          Nieuwsbrieven
        </button>
      </div>

      <AnnouncementFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      {editAnn && (
        <AnnouncementFormDialog open={!!editAnn} onOpenChange={(open) => { if (!open) setEditAnn(null); }} editAnn={editAnn} />
      )}
      <SendMessageDialog open={sendMsgOpen} onOpenChange={setSendMsgOpen} />
      <MessageDetailDialog message={selectedMessage} onClose={() => setSelectedMessage(null)} currentUserId={user?.id || ""} />

      {activeTab === "announcements" && (
        <>
          {sorted.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center py-12">
                <Megaphone className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Geen aankondigingen</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {sorted.map((ann) => (
                <Card key={ann.id} className={ann.pinned ? "border-primary/30" : ""}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${
                        ann.priority === "high"
                          ? "bg-destructive/10 text-destructive"
                          : ann.priority === "medium"
                          ? "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {ann.priority === "high" ? <AlertCircle className="h-4 w-4" /> : <Megaphone className="h-4 w-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-sm" data-testid={`text-announcement-${ann.id}`}>{ann.title}</h3>
                          {ann.pinned && (
                            <Badge variant="secondary" className="text-xs gap-1">
                              <Pin className="h-3 w-3" /> Vastgezet
                            </Badge>
                          )}
                          <Badge variant={ann.priority === "high" ? "destructive" : "outline"} className="text-xs">
                            {ann.priority === "high" ? "Hoog" : ann.priority === "medium" ? "Medium" : ann.priority === "low" ? "Laag" : "Normaal"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{ann.content}</p>
                        {ann.pdfUrl && (
                          <a
                            href={ann.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 mt-2 text-sm text-primary hover:underline"
                            data-testid={`link-pdf-${ann.id}`}
                          >
                            <FileText className="h-4 w-4" />
                            PDF-bijlage bekijken
                          </a>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          {format(new Date(ann.createdAt), "d MMMM yyyy 'om' HH:mm", { locale: nl })}
                        </p>
                      </div>
                      {isAdminOrManager && (
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" onClick={() => setEditAnn(ann)} data-testid={`button-edit-announcement-${ann.id}`}>
                            <Pencil className="h-4 w-4 text-muted-foreground" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => deleteMutation.mutate(ann.id)} data-testid={`button-delete-announcement-${ann.id}`}>
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === "messages" && (
        <>
          {messagesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}
            </div>
          ) : (messagesData || []).length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center py-12">
                <Mail className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Geen berichten</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {(messagesData || []).map((msg) => {
                const isSent = msg.fromUserId === user?.id;
                const isUnread = !isSent && !msg.read;
                return (
                  <Card
                    key={msg.id}
                    className={`cursor-pointer hover-elevate ${isUnread ? "border-primary/40" : ""}`}
                    onClick={() => setSelectedMessage(msg)}
                    data-testid={`card-message-${msg.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${
                          isUnread ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                        }`}>
                          {isUnread ? <Mail className="h-4 w-4" /> : <MailOpen className="h-4 w-4" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className={`text-sm ${isUnread ? "font-bold" : "font-semibold"}`} data-testid={`text-message-subject-${msg.id}`}>
                              {msg.subject}
                            </h3>
                            {isSent && (
                              <Badge variant="outline" className="text-xs">
                                <Send className="h-3 w-3 mr-1" /> Verzonden
                              </Badge>
                            )}
                            {isUnread && (
                              <Badge variant="default" className="text-xs">Nieuw</Badge>
                            )}
                            {msg.reply && (
                              <Badge variant="secondary" className="text-xs gap-1">
                                <Reply className="h-3 w-3" /> Beantwoord
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {isSent ? `Aan: ${msg.toUserName}` : `Van: ${msg.fromUserName}`}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{msg.content}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {format(new Date(msg.createdAt), "d MMMM yyyy 'om' HH:mm", { locale: nl })}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {activeTab === "nieuwsbrieven" && (
        <NieuwsbrievenTab />
      )}
    </div>
  );
}

function NieuwsbrievenTab() {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const isAdmin = isAdminRole(user?.role);

  type NieuwsbriefFile = { name: string; path: string; size: number; modified: string };

  const { data: files, isLoading } = useQuery<NieuwsbriefFile[]>({
    queryKey: ["/api/uploads/nieuwsbrief"],
  });

  const handleUpload = async (file: File) => {
    if (file.type !== "application/pdf") {
      toast({ title: "Alleen PDF-bestanden toegestaan", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("pdf", file);
      const csrfToken = await fetchCsrfToken();
      const res = await fetch("/api/uploads/nieuwsbrief", {
        method: "POST",
        body: formData,
        credentials: "include",
        headers: { "X-CSRF-Token": csrfToken },
      });
      if (!res.ok) throw new Error("Upload mislukt");
      queryClient.invalidateQueries({ queryKey: ["/api/uploads/nieuwsbrief"] });
      toast({ title: "Nieuwsbrief toegevoegd" });
    } catch {
      toast({ title: "Fout bij uploaden", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (filename: string) => {
    try {
      const csrfToken = await fetchCsrfToken();
      const res = await fetch(`/api/uploads/nieuwsbrief/${encodeURIComponent(filename)}`, {
        method: "DELETE",
        credentials: "include",
        headers: { "X-CSRF-Token": csrfToken },
      });
      if (!res.ok) throw new Error("Verwijderen mislukt");
      queryClient.invalidateQueries({ queryKey: ["/api/uploads/nieuwsbrief"] });
      toast({ title: "Nieuwsbrief verwijderd" });
    } catch {
      toast({ title: "Fout bij verwijderen", variant: "destructive" });
    }
  };

  if (isLoading) {
    return <div className="space-y-4">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}</div>;
  }

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="flex justify-end">
          <Button
            onClick={() => document.getElementById("nieuwsbrief-upload-input")?.click()}
            disabled={uploading}
            data-testid="button-add-nieuwsbrief"
          >
            <Upload className="h-4 w-4 mr-2" />
            {uploading ? "Uploaden..." : "Nieuw Document"}
          </Button>
          <input
            id="nieuwsbrief-upload-input"
            type="file"
            className="hidden"
            accept=".pdf,application/pdf"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUpload(file);
              e.target.value = "";
            }}
            data-testid="input-nieuwsbrief-upload"
          />
        </div>
      )}

      {!files || files.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <Newspaper className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Geen nieuwsbrieven gevonden</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Newspaper className="h-4 w-4 text-primary" />
              Documenten ({files.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {files.map((file) => (
                <div
                  key={file.name}
                  className="flex items-center justify-between gap-3 p-2.5 rounded-md group hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => window.open(file.path, "_blank")}
                  data-testid={`nieuwsbrief-file-${file.name}`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <FileText className="h-5 w-5 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.name.replace(/\.pdf$/i, "")}</p>
                      <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p>
                    </div>
                  </div>
                  {isAdmin && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="shrink-0 invisible group-hover:visible"
                      onClick={(e) => { e.stopPropagation(); handleDelete(file.name); }}
                      data-testid={`button-delete-nieuwsbrief-${file.name}`}
                    >
                      <Trash2 className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
