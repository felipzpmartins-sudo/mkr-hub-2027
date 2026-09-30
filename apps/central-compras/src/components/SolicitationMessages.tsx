import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Loader2, Send, Lock, User } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Message {
  id: string;
  sender_id: string;
  channel: "user" | "internal";
  message: string;
  created_at: string;
  sender_name?: string;
}

interface Props {
  solicitationId: string;
  /** true if current user is approver/admin (can see internal + write to both) */
  isStaff: boolean;
  /** true if current user is the requester (can write user channel) */
  isRequester?: boolean;
}

export const SolicitationMessages = ({ solicitationId, isStaff, isRequester = false }: Props) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [tab, setTab] = useState<"user" | "internal">("user");
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    load();

    const channel = supabase
      .channel(`sol-msg-${solicitationId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "solicitation_messages", filter: `solicitation_id=eq.${solicitationId}` },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solicitationId]);

  const load = async () => {
    const { data, error } = await supabase
      .from("solicitation_messages" as any)
      .select("*")
      .eq("solicitation_id", solicitationId)
      .order("created_at", { ascending: true });
    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }
    const withNames = await Promise.all(
      ((data as any[]) || []).map(async (m) => {
        const { data: name } = await (supabase.rpc as any)("get_approver_display_name", {
          _user_id: m.sender_id,
        });
        return { ...m, sender_name: (name as string) || "Usuário" } as Message;
      }),
    );
    setMessages(withNames);
    setLoading(false);
  };

  const send = async () => {
    const t = text.trim();
    if (!t) return;
    setSending(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");
      const channel = isStaff ? tab : "user";
      const { error } = await supabase.from("solicitation_messages" as any).insert({
        solicitation_id: solicitationId,
        sender_id: user.id,
        channel,
        message: t,
      });
      if (error) throw error;
      setText("");
      toast.success("Mensagem enviada");
      await load();
    } catch (e: any) {
      console.error(e);
      toast.error("Erro ao enviar mensagem");
    } finally {
      setSending(false);
    }
  };

  if (loading) return null;

  const userMsgs = messages.filter((m) => m.channel === "user");
  const internalMsgs = messages.filter((m) => m.channel === "internal");

  const renderList = (list: Message[], emptyText: string) => (
    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">{emptyText}</p>
      ) : (
        list.map((m) => {
          const mine = userId === m.sender_id;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  mine ? "bg-primary text-primary-foreground" : "bg-muted"
                }`}
              >
                <div className="flex items-center justify-between gap-3 text-xs opacity-80 mb-0.5">
                  <span className="font-medium">{m.sender_name}</span>
                  <span>{format(new Date(m.created_at), "dd/MM HH:mm", { locale: ptBR })}</span>
                </div>
                <p className="whitespace-pre-wrap">{m.message}</p>
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  const canWriteUser = isStaff || isRequester;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Mensagens
          {internalMsgs.length > 0 && isStaff && (
            <Badge variant="outline" className="ml-1">
              {internalMsgs.length} interna(s)
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isStaff ? (
          <Tabs value={tab} onValueChange={(v) => setTab(v as "user" | "internal")}>
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="user" className="flex items-center gap-2">
                <User className="h-3.5 w-3.5" />
                Com solicitante
                {userMsgs.length > 0 && <Badge variant="secondary" className="ml-1">{userMsgs.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="internal" className="flex items-center gap-2">
                <Lock className="h-3.5 w-3.5" />
                Interno (aprovadores)
                {internalMsgs.length > 0 && <Badge variant="secondary" className="ml-1">{internalMsgs.length}</Badge>}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="user" className="mt-3">
              {renderList(userMsgs, "Nenhuma mensagem para o solicitante ainda.")}
            </TabsContent>
            <TabsContent value="internal" className="mt-3">
              <div className="mb-2 text-xs text-muted-foreground flex items-center gap-1">
                <Lock className="h-3 w-3" /> Visível apenas para aprovadores e administradores.
              </div>
              {renderList(internalMsgs, "Nenhuma mensagem interna ainda.")}
            </TabsContent>
          </Tabs>
        ) : (
          renderList(userMsgs, "Nenhuma mensagem ainda.")
        )}

        {(canWriteUser || isStaff) && (
          <div className="space-y-2 pt-2 border-t">
            <Textarea
              placeholder={
                isStaff && tab === "internal"
                  ? "Mensagem interna (apenas aprovadores/admin verão)..."
                  : "Escreva uma mensagem para o solicitante..."
              }
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={2}
            />
            <div className="flex justify-end">
              <Button size="sm" onClick={send} disabled={sending || !text.trim()}>
                {sending ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5 mr-1" />
                )}
                Enviar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
