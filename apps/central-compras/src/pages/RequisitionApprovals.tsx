import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, XCircle, LogOut, ClipboardList, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatDateOnly } from "@/lib/utils";

interface Requisition {
  id: string;
  created_at: string;
  requester_name: string;
  user_id: string;
  usage_purpose: string | null;
  requesting_sector: string | null;
  return_deadline: string | null;
  requisition_date: string | null;
  responsibility_accepted: boolean | null;
  requester_signature_name: string | null;
  requester_signature_data: string | null;
  items_list: any;
  approval_status: string;
  approver_observation: string | null;
  user_messages_count: number;
}

const RequisitionApprovals = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState("");
  const [items, setItems] = useState<Requisition[]>([]);
  const [observations, setObservations] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUserId(session.user.id);

      const { data: roles } = await supabase
        .from("user_roles").select("role").eq("user_id", session.user.id);
      const allowed = roles?.some((r: any) =>
        ["requisition_approver", "admin", "super_admin"].includes(r.role)
      );
      if (!allowed) {
        toast.error("Acesso restrito a aprovadores de requisição.");
        navigate("/");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles").select("full_name").eq("user_id", session.user.id).maybeSingle();
      setUserName(profile?.full_name || "");

      await load();
    };
    init();

    const realtime = supabase
      .channel("requisition-approvals-messages")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "solicitation_messages" },
        () => {
          load();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(realtime);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("solicitations")
      .select("*")
      .eq("request_type", "internal_requisition")
      .in("approval_status", ["pending_approval", "pending_quotes"])
      .order("created_at", { ascending: false });
    if (error) {
      console.error(error);
      toast.error("Erro ao carregar requisições");
    } else {
      const withMessageCounts = await Promise.all(
        ((data as any[]) || []).map(async (req) => {
          const { count: userMessagesCount } = await supabase
            .from('solicitation_messages' as any)
            .select('*', { count: 'exact', head: true })
            .eq('solicitation_id', req.id)
            .eq('channel', 'user')
            .eq('sender_id', req.user_id);
          return {
            ...req,
            user_messages_count: userMessagesCount || 0,
          } as Requisition;
        })
      );
      setItems(withMessageCounts);
    }
    setLoading(false);
  };

  const handleDecision = async (req: Requisition, decision: "approved" | "rejected") => {
    if (!userId) return;
    setBusyId(req.id);
    try {
      const obs = observations[req.id]?.trim() || null;

      if (obs) {
        await supabase
          .from("solicitations")
          .update({ approver_observation: obs })
          .eq("id", req.id);
      }

      const { error } = await supabase.from("approvals").insert({
        solicitation_id: req.id,
        approver_id: userId,
        status: decision,
        justification: obs,
      });
      if (error) throw error;

      if (decision === "approved") {
        try {
          const { data: fresh } = await supabase
            .from("solicitations")
            .select("approval_status, stock_status, requester_name, items_list, allocation_location, allocation_location_other")
            .eq("id", req.id)
            .maybeSingle();
          if (fresh && (fresh.stock_status === "pending_pickup" || fresh.approval_status === "approved_released")) {
            const items = Array.isArray(fresh.items_list) ? fresh.items_list : [];
            const itemsSummary = items
              .map((it: any) => `${it.quantity ?? 1}x ${it.name ?? it.product_name ?? "Item"}`)
              .join(", ");
            const allocationLocation =
              fresh.allocation_location === "Outro"
                ? fresh.allocation_location_other || "Outro"
                : fresh.allocation_location || "";
            const payload = {
              templateName: "stock-pickup-ready",
              templateData: {
                requesterName: fresh.requester_name,
                itemsSummary,
                allocationLocation,
                solicitationId: req.id,
              },
            };
            await Promise.all([
              supabase.functions.invoke("send-transactional-email", {
                body: { ...payload, recipientEmail: "logistica@mkr.makergrupo.com.br", idempotencyKey: `stock-ready-${req.id}-logistica` },
              }),
              supabase.functions.invoke("send-transactional-email", {
                body: { ...payload, recipientEmail: "lf473418@gmail.com", idempotencyKey: `stock-ready-${req.id}-lf` },
              }),
            ]);
          }
        } catch (notifyErr) {
          console.error("Falha ao notificar estoque:", notifyErr);
        }
      }

      toast.success(decision === "approved" ? "Requisição aprovada!" : "Requisição reprovada.");
      await load();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Erro ao registrar decisão");
    } finally {
      setBusyId(null);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ClipboardList className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-xl font-bold">Aprovação de Requisições Internas</h1>
              <p className="text-xs text-muted-foreground">{userName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/estoque")}>
              Estoque
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" /> Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-4">
        {loading ? (
          <p className="text-muted-foreground text-center py-12">Carregando...</p>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Nenhuma requisição pendente no momento.
            </CardContent>
          </Card>
        ) : (
          items.map((r) => {
            const itemsList = Array.isArray(r.items_list) ? r.items_list : [];
            return (
              <Card key={r.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">
                        Requisição de {r.requester_name}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        Criada em {format(new Date(r.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <Badge variant="outline">Pendente</Badge>
                      {r.user_messages_count > 0 && (
                        <Badge className="bg-red-500 text-white hover:bg-red-600 whitespace-nowrap">
                          <MessageSquare className="h-3 w-3 mr-1" />
                          {r.user_messages_count} mensagem(s)
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Setor solicitante</p>
                      <p className="font-medium">{r.requesting_sector || "—"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Prazo para devolução</p>
                      <p className="font-medium">
                        {formatDateOnly(r.return_deadline)}
                      </p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-muted-foreground">Finalidade de uso</p>
                      <p className="font-medium whitespace-pre-wrap">{r.usage_purpose || "—"}</p>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <p className="text-sm font-semibold mb-2">Produtos/Materiais</p>
                    {itemsList.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Nenhum item informado.</p>
                    ) : (
                      <ul className="space-y-1 text-sm">
                        {itemsList.map((it: any, idx: number) => (
                          <li key={idx} className="border rounded px-3 py-2">
                            <span className="font-medium">{it.name || it.product_name || "Item"}</span>
                            {it.quantity ? <span className="text-muted-foreground"> — Qtd: {it.quantity}</span> : null}
                            {it.observations ? (
                              <p className="text-xs text-muted-foreground mt-1">{it.observations}</p>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <Separator />

                  <div className="rounded border bg-muted/40 p-3 text-xs">
                    <p className="font-semibold mb-1">Termo de Responsabilidade</p>
                    <p className="text-muted-foreground">
                      O solicitante declara estar ciente de sua responsabilidade pela utilização, conservação e devolução dos produtos requisitados, comprometendo-se a devolvê-los em perfeitas condições e dentro do prazo estabelecido.
                    </p>
                    <p className="mt-2">
                      Aceito pelo solicitante:{" "}
                      <strong>{r.responsibility_accepted ? "Sim" : "Não"}</strong>
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-semibold mb-2">Assinatura do Funcionário Solicitante</p>
                    <div className="border rounded p-3 bg-white">
                      {r.requester_signature_data ? (
                        <img
                          src={r.requester_signature_data}
                          alt="Assinatura"
                          className="max-h-32 object-contain"
                        />
                      ) : (
                        <p className="text-sm text-muted-foreground">Sem assinatura registrada.</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        {r.requester_signature_name || r.requester_name}
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-semibold mb-1 block">Observação (opcional)</label>
                    <Textarea
                      placeholder="Adicione uma observação para esta decisão..."
                      value={observations[r.id] || ""}
                      onChange={(e) =>
                        setObservations((prev) => ({ ...prev, [r.id]: e.target.value }))
                      }
                      rows={2}
                    />
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => handleDecision(r, "rejected")}
                      disabled={busyId === r.id}
                    >
                      <XCircle className="h-4 w-4 mr-2" /> Reprovar
                    </Button>
                    <Button
                      onClick={() => handleDecision(r, "approved")}
                      disabled={busyId === r.id}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" /> Aprovar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </main>
    </div>
  );
};

export default RequisitionApprovals;
