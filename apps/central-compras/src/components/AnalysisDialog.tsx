import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FileText, Download, CheckCircle, XCircle, User, DollarSign, Loader2, ExternalLink, History, Printer } from "lucide-react";
import { printRequisition } from "@/lib/printRequisition";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatDateOnly } from "@/lib/utils";
import { ApproverQuestions } from "@/components/ApproverQuestions";
import { SolicitationMessages } from "@/components/SolicitationMessages";

interface Quote {
  id: string;
  file_path: string;
  file_name: string;
  supplier_name: string | null;
  store_name: string | null;
  value: number | null;
  created_at: string;
  product_name: string | null;
}

interface Approval {
  id: string;
  approver_id: string;
  status: string;
  justification: string | null;
  created_at: string;
  selected_quote_id: string | null;
  selected_quote_ids: string[] | null;
  approver_name?: string;
}

interface HistoryEntry {
  id: string;
  changed_by: string;
  old_status: string | null;
  new_status: string;
  justification: string | null;
  created_at: string;
  actor_name?: string;
}

interface ApostilaItem {
  name: string;
  quantity: number;
}

interface ProductListItem {
  name: string;
  quantity: number;
  link?: string | null;
  observations?: string | null;
}

interface Solicitation {
  id: string;
  requester_name: string;
  requester_email: string | null;
  requester_phone: string;
  request_type: string;
  product_name: string | null;
  product_quantity: number | null;
  product_link: string | null;
  product_observations: string | null;
  product_photo_or_print: string | null;
  flight_origin: string | null;
  flight_destination: string | null;
  flight_departure_date: string | null;
  flight_return_date: string | null;
  flight_time: string | null;
  flight_preferred_airline: string | null;
  flight_estimated_value: number | null;
  flight_observations: string | null;
  flight_search_link: string | null;
  flight_proof_attachment: string | null;
  material_type: string | null;
  material_type_other: string | null;
  material_quantity: number | null;
  material_dimensions: string | null;
  material_size: string | null;
  material_purpose: string | null;
  material_observations: string | null;
  material_art_files: string | null;
  material_visual_references: string | null;
  accommodation_destination_city: string | null;
  accommodation_destination_state: string | null;
  accommodation_check_in: string | null;
  accommodation_check_out: string | null;
  accommodation_travel_reason: string | null;
  accommodation_event_address: string | null;
  accommodation_guests_count: number | null;
  accommodation_guests_data: unknown;
  accommodation_selected_hotel: string | null;
  accommodation_hotel_address: string | null;
  accommodation_hotel_contact: string | null;
  accommodation_requester_cpf: string | null;
  accommodation_requester_birth_date: string | null;
  accommodation_admin_observation: string | null;
  general_description: string | null;
  approval_status: string;
  approved_count: number;
  items_list: (ApostilaItem | ProductListItem)[] | null;
  requisition_date?: string | null;
  return_deadline?: string | null;
  usage_purpose?: string | null;
  requesting_sector?: string | null;
  responsibility_accepted?: boolean | null;
  requester_signature_name?: string | null;
  requester_signature_data?: string | null;
}

interface AnalysisDialogProps {
  solicitationId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  approverEmail: string;
  readOnly?: boolean;
  canAnswerQuestions?: boolean;
}

const VETO_APPROVER_EMAILS = ['ceo@makergrupo.com.br', 'controller@makergrupo.com.br'];

const requestTypeLabels: Record<string, string> = {
  product: "Produto",
  flight: "Passagem Aérea",
  personalized_material: "Material Personalizado",
  accommodation: "Reserva de Hospedagem",
  apostilas: "Apostilas",
  cleaning_product: "Produto de Limpeza",
  internal_requisition: "Requisição Interna",
};

export const AnalysisDialog = ({
  solicitationId,
  open,
  onOpenChange,
  onSuccess,
  approverEmail,
  readOnly = false,
  canAnswerQuestions = false,
}: AnalysisDialogProps) => {
  const [solicitation, setSolicitation] = useState<Solicitation | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [attachments, setAttachments] = useState<Array<{ id: string; file_name: string; file_path: string; attachment_type?: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [justification, setJustification] = useState("");
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  // seleção de orçamento por produto: { [productKey]: quoteId }
  const [selectedByProduct, setSelectedByProduct] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [myVote, setMyVote] = useState<string | null>(null);
  const [vetoReason, setVetoReason] = useState("");
  const [vetoSubmitting, setVetoSubmitting] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  const isVetoApprover = VETO_APPROVER_EMAILS.includes(approverEmail.toLowerCase());

  useEffect(() => {
    if (open && solicitationId) {
      loadData();
    }
  }, [open, solicitationId]);

  const loadData = async () => {
    if (!solicitationId) return;
    
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      // Load solicitation
      const { data: solData, error: solError } = await supabase
        .from('solicitations')
        .select('*')
        .eq('id', solicitationId)
        .single();

      if (solError) throw solError;
      setSolicitation(solData as unknown as Solicitation);

      // Load quotes
      const { data: quotesData, error: quotesError } = await supabase
        .from('quotes')
        .select('*')
        .eq('solicitation_id', solicitationId)
        .order('created_at', { ascending: true });

      if (quotesError) throw quotesError;
      setQuotes(quotesData as Quote[]);

      // Load attachments (PDFs anexados, ex.: pacote de peças)
      const { data: attachmentsData } = await supabase
        .from('attachments')
        .select('id, file_name, file_path, attachment_type')
        .eq('solicitation_id', solicitationId);
      setAttachments(attachmentsData || []);

      // Load approvals
      const { data: approvalsData, error: approvalsError } = await supabase
        .from('approvals')
        .select('*')
        .eq('solicitation_id', solicitationId);

      if (approvalsError) throw approvalsError;

      // Get approver display names via RPC (looks up approvers list first, then profiles)
      const approvalsWithNames = await Promise.all(
        (approvalsData || []).map(async (approval) => {
          const { data: name } = await (supabase.rpc as any)('get_approver_display_name', {
            _user_id: approval.approver_id,
          });
          return {
            ...approval,
            approver_name: (name as string) || "Aprovador",
          };
        })
      );

      setApprovals(approvalsWithNames as Approval[]);

      // Check if current user has already voted
      const myApproval = approvalsData?.find(a => a.approver_id === user.id);
      setHasVoted(!!myApproval);
      setMyVote(myApproval?.status || null);

      // Load audit history (status_history) in chronological order
      const { data: historyData, error: historyError } = await supabase
        .from('status_history')
        .select('*')
        .eq('solicitation_id', solicitationId)
        .order('created_at', { ascending: true });

      if (historyError) {
        console.warn("Falha ao carregar histórico:", historyError);
        setHistory([]);
      } else {
        const historyWithNames = await Promise.all(
          (historyData || []).map(async (entry) => {
            const { data: name } = await (supabase.rpc as any)('get_approver_display_name', {
              _user_id: entry.changed_by,
            });
            return {
              ...entry,
              actor_name: (name as string) || "Usuário",
            };
          })
        );
        setHistory(historyWithNames as HistoryEntry[]);
      }

    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados da solicitação");
    } finally {
      setLoading(false);
    }
  };

  const downloadQuote = async (quote: Quote) => {
    try {
      // Se for um link externo ou "Sem link", não tenta baixar do storage
      if (quote.file_path.startsWith('http') || quote.file_path === 'Sem link' || quote.file_name === 'Link') {
        if (quote.file_path.startsWith('http')) {
          window.open(quote.file_path, '_blank');
        }
        return;
      }

      const { data, error } = await supabase.storage
        .from('solicitation-attachments')
        .download(quote.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = quote.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Erro ao baixar orçamento:", error);
      toast.error("Erro ao baixar arquivo");
    }
  };

  const downloadAttachment = async (att: { file_name: string; file_path: string }) => {
    try {
      const { data, error } = await supabase.storage
        .from('solicitation-attachments')
        .download(att.file_path);
      if (error) throw error;
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = att.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Erro ao baixar anexo:", error);
      toast.error("Erro ao baixar anexo");
    }
  };

  const handleApprove = async () => {
    if (solicitation?.request_type !== 'internal_requisition') {
      // Agrupa orçamentos por produto (product_name) — se algum orçamento não tiver product_name, cai no grupo "__default__"
      const groups = new Map<string, Quote[]>();
      quotes.forEach((q) => {
        const key = q.product_name || "__default__";
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(q);
      });

      if (groups.size === 0) {
        toast.error("Nenhum orçamento anexado");
        return;
      }

      // Exige uma seleção por grupo de produto
      const missing: string[] = [];
      const selectedIds: string[] = [];
      groups.forEach((_arr, key) => {
        const sel = selectedByProduct[key];
        if (!sel) {
          missing.push(key === "__default__" ? "orçamentos" : key);
        } else {
          selectedIds.push(sel);
        }
      });

      if (missing.length > 0) {
        toast.error(`Selecione um orçamento para: ${missing.join(", ")}`);
        return;
      }

      await submitVote('approved', selectedIds);
      return;
    }
    await submitVote('approved', []);
  };

  const handleReject = async () => {
    if (!justification.trim()) {
      toast.error("Por favor, forneça uma justificativa para a rejeição");
      return;
    }
    await submitVote('rejected', []);
  };

  const submitVote = async (status: 'approved' | 'rejected', selectedIds: string[]) => {
    if (!solicitationId) return;
    
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { error } = await supabase
        .from('approvals')
        .insert({
          solicitation_id: solicitationId,
          approver_id: user.id,
          status,
          justification: justification.trim() || null,
          selected_quote_id: status === 'approved' && selectedIds.length > 0 ? selectedIds[0] : null,
          selected_quote_ids: status === 'approved' && selectedIds.length > 0 ? selectedIds : null,
        } as any);

      if (error) throw error;

      // Auditoria: registra a ação no histórico da solicitação
      const previousStatus = solicitation?.approval_status ?? null;
      const newStatus = status === 'approved' ? 'approval_vote_approved' : 'approval_vote_rejected';
      const { error: historyError } = await supabase
        .from('status_history')
        .insert({
          solicitation_id: solicitationId,
          changed_by: user.id,
          old_status: previousStatus,
          new_status: newStatus,
          justification: justification.trim() || null,
        });
      if (historyError) {
        console.warn("Falha ao registrar histórico de aprovação:", historyError);
      }

      toast.success(status === 'approved' ? "Aprovação registrada!" : "Rejeição registrada!");
      onSuccess();
      onOpenChange(false);
    } catch (error: unknown) {
      console.error("Erro ao registrar voto:", error);
      const errorMessage = error instanceof Error && 'code' in error && error.code === '23505'
        ? "Você já votou nesta solicitação"
        : "Erro ao registrar voto";
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVeto = async () => {
    if (!solicitationId || !solicitation) return;
    if (!vetoReason.trim()) {
      toast.error("Informe o motivo da reprovação para refazer os orçamentos");
      return;
    }

    setVetoSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      // 1. Apaga as aprovações anteriores (mantém os quotes para histórico)
      await supabase
        .from('approvals')
        .delete()
        .eq('solicitation_id', solicitationId);

      // 2. Reseta a solicitação para "aguardando orçamentos" e registra o veto
      const { error: updateError } = await (supabase
        .from('solicitations') as any)
        .update({
          approval_status: 'pending_quotes',
          approved_count: 0,
          released_at: null,
          veto_by: user.id,
          veto_reason: vetoReason.trim(),
          veto_at: new Date().toISOString(),
          veto_count: (solicitation as any).veto_count ? (solicitation as any).veto_count + 1 : 1,
        })
        .eq('id', solicitationId);

      if (updateError) throw updateError;

      // Auditoria: registra a reprovação (veto) no histórico da solicitação
      const { error: historyError } = await supabase
        .from('status_history')
        .insert({
          solicitation_id: solicitationId,
          changed_by: user.id,
          old_status: solicitation.approval_status ?? null,
          new_status: 'vetoed_redo_quotes',
          justification: vetoReason.trim(),
        });
      if (historyError) {
        console.warn("Falha ao registrar histórico de reprovação:", historyError);
      }

      // 3. Notifica o Richard (admin de orçamentos) por e-mail
      const vetoApproverName = approverEmail.toLowerCase() === 'ceo@makergrupo.com.br'
        ? 'Rafael' : 'Alberto';

      try {
        await supabase.functions.invoke('send-transactional-email', {
          body: {
            templateName: 'redo-quotes',
            recipientEmail: 'richard@makergrupo.com.br',
            idempotencyKey: `redo-quotes-${solicitationId}-${Date.now()}`,
            templateData: {
              vetoApproverName,
              requesterName: solicitation.requester_name,
              requestType: solicitation.request_type,
              reason: vetoReason.trim(),
              solicitationId,
            },
          },
        });
      } catch (emailErr) {
        console.warn("Falha ao enviar e-mail de notificação:", emailErr);
      }

      toast.success("Solicitação reprovada. Richard foi notificado para refazer os orçamentos.");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao reprovar solicitação:", error);
      toast.error("Erro ao reprovar solicitação");
    } finally {
      setVetoSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'approved') {
      return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" /> Aprovado</Badge>;
    } else if (status === 'rejected') {
      return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Rejeitado</Badge>;
    }
    return <Badge variant="secondary">Pendente</Badge>;
  };

  if (!open) return null;

  const scrollToVeto = () => {
    const el = document.getElementById('veto-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setTimeout(() => document.getElementById('veto-reason')?.focus(), 400);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Análise de Solicitação
            </DialogTitle>
            {solicitation?.request_type === 'internal_requisition' && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mr-8"
                onClick={() => solicitation && printRequisition(solicitation as any)}
              >
                <Printer className="h-4 w-4 mr-2" />
                Imprimir
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : solicitation ? (
          <div className="space-y-6">
            {/* Solicitation Details */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Dados do Pedido
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Solicitante:</span>
                  <p className="font-medium">{solicitation.requester_name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Tipo:</span>
                  <p className="font-medium">{requestTypeLabels[solicitation.request_type]}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Contato:</span>
                  <p>{solicitation.requester_phone}</p>
                  {solicitation.requester_email && <p>{solicitation.requester_email}</p>}
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <div className="mt-1">
                    <Badge variant={solicitation.approval_status === 'approved_released' ? "default" : "secondary"}
                      className={
                        solicitation.approval_status === 'approved_released' ? "bg-green-500" :
                        solicitation.approval_status === 'approved_partial' ? "bg-yellow-500 text-black" :
                        solicitation.approval_status === 'rejected' ? "bg-red-500" : ""
                      }>
                      {solicitation.approved_count}/2 aprovações
                    </Badge>
                  </div>
                </div>

                {/* Type-specific details */}
                {solicitation.request_type === 'product' && (
                  <>
                    {solicitation.items_list && (solicitation.items_list as ProductListItem[]).length > 0 ? (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Produtos Solicitados:</span>
                        <div className="mt-1 space-y-2">
                          {(solicitation.items_list as ProductListItem[]).map((item, index) => (
                            <div key={index} className="p-3 bg-muted rounded space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="font-medium text-sm">{item.name}</span>
                                <span className="text-muted-foreground text-sm">Qtd: {item.quantity}</span>
                              </div>
                              {item.link && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 px-2"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    window.open(item.link, '_blank', 'noopener,noreferrer');
                                  }}
                                >
                                  <ExternalLink className="h-3.5 w-3.5 mr-1" />
                                  Abrir link
                                </Button>
                              )}
                              {item.observations && (
                                <p className="text-sm text-muted-foreground">{item.observations}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <>
                        <div>
                          <span className="text-muted-foreground">Produto:</span>
                          <p className="font-medium">{solicitation.product_name}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Quantidade:</span>
                          <p>{solicitation.product_quantity}</p>
                        </div>
                        {solicitation.product_link && (
                          <div className="col-span-2">
                            <span className="text-muted-foreground">Link do Produto:</span>
                            <div className="mt-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 px-2"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(solicitation.product_link!, '_blank', 'noopener,noreferrer');
                                }}
                              >
                                <ExternalLink className="h-3.5 w-3.5 mr-1" />
                                Abrir link
                              </Button>
                            </div>
                          </div>
                        )}
                        {solicitation.product_observations && (
                          <div className="col-span-2">
                            <span className="text-muted-foreground">Observações:</span>
                            <p className="mt-1">{solicitation.product_observations}</p>
                          </div>
                        )}
                      </>
                    )}
                    {solicitation.product_photo_or_print && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Foto/Print:</span>
                        <p><a href={solicitation.product_photo_or_print} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Ver imagem</a></p>
                      </div>
                    )}
                  </>
                )}

                {solicitation.request_type === 'flight' && (
                  <>
                    <div>
                      <span className="text-muted-foreground">Origem → Destino:</span>
                      <p className="font-medium">{solicitation.flight_origin} → {solicitation.flight_destination}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Datas:</span>
                      <p>
                        {formatDateOnly(solicitation.flight_departure_date)}
                        {solicitation.flight_return_date && ` - ${formatDateOnly(solicitation.flight_return_date)}`}
                      </p>
                    </div>
                    {solicitation.flight_time && (
                      <div>
                        <span className="text-muted-foreground">Horário:</span>
                        <p>{solicitation.flight_time}</p>
                      </div>
                    )}
                    {solicitation.flight_preferred_airline && (
                      <div>
                        <span className="text-muted-foreground">Cia Aérea Preferida:</span>
                        <p>{solicitation.flight_preferred_airline}</p>
                      </div>
                    )}
                    {solicitation.flight_estimated_value && (
                      <div>
                        <span className="text-muted-foreground">Valor Estimado:</span>
                        <p>R$ {solicitation.flight_estimated_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      </div>
                    )}
                    {solicitation.flight_search_link && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Link de Pesquisa:</span>
                        <p><a href={solicitation.flight_search_link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{solicitation.flight_search_link}</a></p>
                      </div>
                    )}
                    {solicitation.flight_observations && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Observações:</span>
                        <p className="mt-1">{solicitation.flight_observations}</p>
                      </div>
                    )}
                  </>
                )}

                {solicitation.request_type === 'personalized_material' && (
                  <>
                    <div>
                      <span className="text-muted-foreground">Tipo de Material:</span>
                      <p className="font-medium">{solicitation.material_type}{solicitation.material_type_other ? ` - ${solicitation.material_type_other}` : ''}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Quantidade:</span>
                      <p>{solicitation.material_quantity}</p>
                    </div>
                    {solicitation.material_size && (
                      <div>
                        <span className="text-muted-foreground">Tamanho:</span>
                        <p>{solicitation.material_size}</p>
                      </div>
                    )}
                    {solicitation.material_dimensions && (
                      <div>
                        <span className="text-muted-foreground">Dimensões:</span>
                        <p>{solicitation.material_dimensions}</p>
                      </div>
                    )}
                    {solicitation.material_purpose && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Finalidade:</span>
                        <p className="mt-1">{solicitation.material_purpose}</p>
                      </div>
                    )}
                    {solicitation.material_observations && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Observações:</span>
                        <p className="mt-1">{solicitation.material_observations}</p>
                      </div>
                    )}
                    {solicitation.material_art_files && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Arquivos de Arte:</span>
                        <p><a href={solicitation.material_art_files} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Ver arquivo</a></p>
                      </div>
                    )}
                    {solicitation.material_visual_references && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Referências Visuais:</span>
                        <p><a href={solicitation.material_visual_references} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Ver referência</a></p>
                      </div>
                    )}
                  </>
                )}

                {solicitation.request_type === 'accommodation' && (
                  <>
                    <div>
                      <span className="text-muted-foreground">Destino:</span>
                      <p className="font-medium">{solicitation.accommodation_destination_city}{solicitation.accommodation_destination_state ? ` - ${solicitation.accommodation_destination_state}` : ''}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Check-in / Check-out:</span>
                      <p>
                        {formatDateOnly(solicitation.accommodation_check_in)}
                        {solicitation.accommodation_check_out && ` - ${formatDateOnly(solicitation.accommodation_check_out)}`}
                      </p>
                    </div>
                    {solicitation.accommodation_guests_count && (
                      <div>
                        <span className="text-muted-foreground">Hóspedes:</span>
                        <p>{solicitation.accommodation_guests_count}</p>
                      </div>
                    )}
                    {solicitation.accommodation_travel_reason && (
                      <div>
                        <span className="text-muted-foreground">Motivo da Viagem:</span>
                        <p>{solicitation.accommodation_travel_reason}</p>
                      </div>
                    )}
                    {solicitation.accommodation_event_address && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Endereço do Evento:</span>
                        <p>{solicitation.accommodation_event_address}</p>
                      </div>
                    )}
                    {solicitation.accommodation_requester_cpf && (
                      <div>
                        <span className="text-muted-foreground">CPF do Solicitante:</span>
                        <p>{solicitation.accommodation_requester_cpf}</p>
                      </div>
                    )}
                    {solicitation.accommodation_requester_birth_date && (
                      <div>
                        <span className="text-muted-foreground">Data de Nascimento:</span>
                        <p>{formatDateOnly(solicitation.accommodation_requester_birth_date)}</p>
                      </div>
                    )}
                    {solicitation.accommodation_selected_hotel && (
                      <div>
                        <span className="text-muted-foreground">Hotel Selecionado:</span>
                        <p>{solicitation.accommodation_selected_hotel}</p>
                      </div>
                    )}
                    {solicitation.accommodation_hotel_address && (
                      <div>
                        <span className="text-muted-foreground">Endereço do Hotel:</span>
                        <p>{solicitation.accommodation_hotel_address}</p>
                      </div>
                    )}
                    {solicitation.accommodation_hotel_contact && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Contato do Hotel:</span>
                        <p>{solicitation.accommodation_hotel_contact}</p>
                      </div>
                    )}
                    {solicitation.accommodation_admin_observation && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Observação do Admin:</span>
                        <p className="mt-1">{solicitation.accommodation_admin_observation}</p>
                      </div>
                    )}
                  </>
                )}

                {/* Produtos de Limpeza */}
                {solicitation.request_type === 'cleaning_product' && solicitation.items_list && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Lista de Produtos de Limpeza:</span>
                    <div className="mt-1 space-y-1">
                      {(solicitation.items_list as ApostilaItem[]).map((item, index) => (
                        <div key={index} className="flex justify-between items-center p-2 bg-muted rounded text-sm">
                          <span className="font-medium">{item.name}</span>
                          <span className="text-muted-foreground">Qtd: {item.quantity}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      A decisão é pelo valor total do orçamento de cada loja, não por item.
                    </p>
                  </div>
                )}

                {/* Apostilas */}
                {solicitation.request_type === 'apostilas' && solicitation.items_list && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Lista de Apostilas:</span>
                    <div className="mt-1 space-y-1">
                      {(solicitation.items_list as ApostilaItem[]).map((item, index) => (
                        <div key={index} className="flex justify-between items-center p-2 bg-muted rounded text-sm">
                          <span className="font-medium">{item.name}</span>
                          <span className="text-muted-foreground">Qtd: {item.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Internal Requisition */}
                {solicitation.request_type === 'internal_requisition' && (
                  <>
                    {solicitation.requesting_sector && (
                      <div>
                        <span className="text-muted-foreground">Setor Solicitante:</span>
                        <p className="font-medium">{solicitation.requesting_sector}</p>
                      </div>
                    )}
                    {solicitation.requisition_date && (
                      <div>
                        <span className="text-muted-foreground">Data da Solicitação:</span>
                        <p>{formatDateOnly(solicitation.requisition_date)}</p>
                      </div>
                    )}
                    {solicitation.return_deadline && (
                      <div>
                        <span className="text-muted-foreground">Prazo para Devolução:</span>
                        <p>{formatDateOnly(solicitation.return_deadline)}</p>
                      </div>
                    )}
                    {solicitation.usage_purpose && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Finalidade de Uso:</span>
                        <p className="mt-1">{solicitation.usage_purpose}</p>
                      </div>
                    )}
                    {solicitation.items_list && (solicitation.items_list as ProductListItem[]).length > 0 && (
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Produtos Requisitados:</span>
                        <div className="mt-1 space-y-2">
                          {(solicitation.items_list as ProductListItem[]).map((item, index) => (
                            <div key={index} className="p-3 bg-muted rounded space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="font-medium text-sm">{item.name}</span>
                                <span className="text-muted-foreground text-sm">Qtd: {item.quantity}</span>
                              </div>
                              {item.observations && (
                                <p className="text-sm text-muted-foreground">{item.observations}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="col-span-2 p-4 rounded-lg border-2 border-primary/30 bg-primary/5">
                      <h4 className="font-semibold text-sm mb-2">Termo de Responsabilidade</h4>
                      <p className="text-sm text-foreground/80 leading-relaxed mb-3">
                        O solicitante declara estar ciente de sua responsabilidade pela utilização, conservação e devolução dos produtos requisitados, comprometendo-se a devolvê-los em perfeitas condições e dentro do prazo estabelecido. Após o vencimento do prazo de devolução, será gerado um alerta automático.
                      </p>
                      <div className="flex items-center gap-2 text-sm">
                        {solicitation.responsibility_accepted ? (
                          <><CheckCircle className="h-4 w-4 text-green-600" /> <span className="font-medium text-green-700">Termo aceito pelo solicitante</span></>
                        ) : (
                          <><XCircle className="h-4 w-4 text-destructive" /> <span className="font-medium text-destructive">Termo não aceito</span></>
                        )}
                      </div>
                    </div>
                    {(solicitation.requester_signature_name || solicitation.requester_signature_data) && (
                      <div className="col-span-2 p-4 bg-secondary/50 rounded-lg">
                        <h4 className="font-semibold text-sm mb-2">Assinatura do Solicitante</h4>
                        {solicitation.requester_signature_name && (
                          <p className="text-sm mb-2"><span className="text-muted-foreground">Nome:</span> <span className="font-medium">{solicitation.requester_signature_name}</span></p>
                        )}
                        {solicitation.requester_signature_data && (
                          <div className="bg-white border rounded p-2 inline-block">
                            <img src={solicitation.requester_signature_data} alt="Assinatura" className="max-h-32" />
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                {solicitation.general_description && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Descrição Geral:</span>
                    <p className="mt-1">{solicitation.general_description}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Anexos (PDFs do pacote de peças e outros documentos) */}
            {attachments.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Anexos ({attachments.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {attachments.map((att) => (
                    <div key={att.id} className="flex items-center justify-between p-2 bg-secondary/50 rounded">
                      <span className="text-sm truncate flex-1">{att.file_name}</span>
                      <Button size="sm" variant="ghost" onClick={() => downloadAttachment(att)}>
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Quotes — não se aplica a Requisição Interna */}
            {solicitation.request_type !== 'internal_requisition' && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Orçamentos ({quotes.length}/3)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {quotes.length === 0 ? (
                  <p className="text-muted-foreground text-sm">Nenhum orçamento anexado</p>
                ) : (
                  (() => {
                    // Agrupa orçamentos por produto
                    const groups: Record<string, Quote[]> = {};
                    quotes.forEach((q) => {
                      const key = q.product_name || "__default__";
                      (groups[key] ||= []).push(q);
                    });
                    const groupKeys = Object.keys(groups);
                    const disabled = hasVoted || solicitation.approval_status === 'approved_released' || solicitation.approval_status === 'rejected';

                    return (
                      <div className="space-y-6">
                        {groupKeys.map((key) => {
                          const groupQuotes = groups[key];
                          const groupLabel = key === "__default__" ? "Orçamentos" : key;
                          const selectedInGroup = selectedByProduct[key] || "";
                          return (
                            <div key={key} className="space-y-2">
                              {groupKeys.length > 1 || key !== "__default__" ? (
                                <div className="flex items-center gap-2 pb-1 border-b">
                                  <span className="text-sm font-semibold">Produto:</span>
                                  <span className="text-sm">{groupLabel}</span>
                                  <span className="ml-auto text-xs text-muted-foreground">
                                    Selecione 1 orçamento
                                  </span>
                                </div>
                              ) : null}
                              <RadioGroup
                                value={selectedInGroup}
                                onValueChange={(val) =>
                                  setSelectedByProduct((prev) => ({ ...prev, [key]: val }))
                                }
                                disabled={disabled}
                              >
                                <div className="space-y-3">
                                  {groupQuotes.map((quote, index) => (
                                    <div key={quote.id} className={`p-4 rounded-lg border-2 transition-colors ${
                                      selectedInGroup === quote.id
                                        ? 'border-primary bg-primary/5'
                                        : 'border-transparent bg-muted hover:border-muted-foreground/20'
                                    }`}>
                                      <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-3">
                                          <RadioGroupItem value={quote.id} id={`quote-${quote.id}`} className="mt-1" />
                                          <Label htmlFor={`quote-${quote.id}`} className="cursor-pointer">
                                            <p className="font-medium text-sm mb-1">
                                              Orçamento {index + 1}
                                            </p>
                                            {quote.store_name && (
                                              <p className="text-sm font-semibold text-primary mb-1">
                                                🏪 {quote.store_name}
                                              </p>
                                            )}
                                          </Label>
                                        </div>
                                        <div className="flex items-center gap-3">
                                          {quote.value && (
                                            <span className="font-semibold text-green-600 text-base">
                                              R$ {quote.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      <div className="ml-8 space-y-2 mt-1">
                                        {quote.file_path.startsWith('http') && (
                                          <div className="flex items-center gap-2 text-sm">
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className="h-7 px-2"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                window.open(quote.file_path, '_blank', 'noopener,noreferrer');
                                              }}
                                            >
                                              <ExternalLink className="h-3.5 w-3.5 mr-1" />
                                              Abrir link
                                            </Button>
                                          </div>
                                        )}

                                        {!quote.file_path.startsWith('http') && quote.file_name !== 'Link' && quote.file_path !== 'Sem link' && (
                                          <div className="flex items-center gap-2 text-sm">
                                            <FileText className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                            <span className="text-muted-foreground">{quote.file_name}</span>
                                            <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => downloadQuote(quote)}>
                                              <Download className="h-3.5 w-3.5 mr-1" />
                                              Baixar
                                            </Button>
                                          </div>
                                        )}

                                        {quote.supplier_name && (
                                          <div className="text-sm">
                                            <span className="text-muted-foreground">Comentário: </span>
                                            <span className="whitespace-pre-wrap break-words">{quote.supplier_name}</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </RadioGroup>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()
                )}
              </CardContent>
            </Card>
            )}

            {/* Previous Approvals */}
            {approvals.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Votos Anteriores</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {approvals.map((approval) => {
                      const selectedIds = (approval.selected_quote_ids && approval.selected_quote_ids.length > 0)
                        ? approval.selected_quote_ids
                        : (approval.selected_quote_id ? [approval.selected_quote_id] : []);
                      const selectedQuotes = selectedIds
                        .map((id) => quotes.find((q) => q.id === id))
                        .filter(Boolean) as Quote[];

                      return (
                        <div key={approval.id} className="p-3 bg-muted rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{approval.approver_name}</span>
                              {getStatusBadge(approval.status)}
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(approval.created_at), "dd/MM HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                          {approval.status === 'approved' && selectedQuotes.length > 0 && (
                            <div className="mt-1 space-y-1">
                              {selectedQuotes.map((sq) => {
                                const idx = quotes.findIndex((q) => q.id === sq.id) + 1;
                                return (
                                  <div key={sq.id} className="text-sm text-primary flex items-center gap-2">
                                    <CheckCircle className="h-4 w-4" />
                                    <span>
                                      {sq.product_name ? <><strong>{sq.product_name}:</strong> </> : null}
                                      Orçamento {idx}
                                      {sq.value && (
                                        <span className="text-green-600 ml-2">
                                          (R$ {sq.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          {approval.justification && (
                            <p className="text-sm text-muted-foreground mt-1 italic">
                              "{approval.justification}"
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Approver questions (ask/see answers) */}
            <ApproverQuestions
              solicitationId={solicitation.id}
              canAsk={!readOnly && !hasVoted && solicitation.approval_status !== 'approved_released' && solicitation.approval_status !== 'rejected' && solicitation.approval_status !== 'delivered'}
              canAnswer={canAnswerQuestions}
              requesterName={solicitation.requester_name}
              requestType={solicitation.request_type}
              onUpdated={onSuccess}
            />

            {/* Chat: solicitante e interno */}
            <SolicitationMessages
              solicitationId={solicitation.id}
              isStaff={true}
            />



            {/* Audit History */}
            {history.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <History className="h-4 w-4" />
                    Histórico de Auditoria
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {history.map((entry) => {
                      const actionLabels: Record<string, { label: string; className: string }> = {
                        approval_vote_approved: { label: "Aprovou", className: "bg-green-500" },
                        approval_vote_rejected: { label: "Rejeitou", className: "bg-destructive text-destructive-foreground" },
                        vetoed_redo_quotes: { label: "Reprovou (refazer orçamentos)", className: "bg-destructive text-destructive-foreground" },
                      };
                      const action = actionLabels[entry.new_status] ?? { label: entry.new_status, className: "bg-muted text-foreground" };

                      return (
                        <div key={entry.id} className="p-3 bg-muted rounded-lg border-l-2 border-primary/40">
                          <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                            <div className="flex items-center gap-2">
                              <User className="h-3 w-3 text-muted-foreground" />
                              <span className="font-medium text-sm">{entry.actor_name}</span>
                              <Badge className={action.className}>{action.label}</Badge>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(entry.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                          {entry.justification && (
                            <p className="text-sm text-muted-foreground mt-1 italic whitespace-pre-wrap break-words">
                              "{entry.justification}"
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}


            {isVetoApprover && solicitation.request_type !== 'internal_requisition' && solicitation.approval_status !== 'pending_quotes' && solicitation.approval_status !== 'delivered' && (
              <Card id="veto-section" className="border-destructive/40 bg-destructive/5 scroll-mt-4">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2 text-destructive">
                    <XCircle className="h-4 w-4" />
                    Reprovar e Refazer Orçamento
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Como aprovador especial, você pode reprovar esta solicitação a qualquer momento.
                    Isso reseta as aprovações e devolve o pedido para Richard refazer os orçamentos.
                    O histórico atual permanece visível.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="veto-reason">Motivo da reprovação (obrigatório)</Label>
                    <Textarea
                      id="veto-reason"
                      value={vetoReason}
                      onChange={(e) => setVetoReason(e.target.value)}
                      placeholder="Ex: valores acima do esperado, buscar novos fornecedores..."
                      rows={3}
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button
                      variant="destructive"
                      onClick={handleVeto}
                      disabled={vetoSubmitting || !vetoReason.trim()}
                    >
                      {vetoSubmitting ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <XCircle className="mr-2 h-4 w-4" />
                      )}
                      Reprovar e solicitar novos orçamentos
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Voting Section — somente justificativa (botões vão para o footer fixo) */}
            {readOnly ? (
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="pt-4">
                  <p className="text-blue-700 text-center">
                    Acesso de acompanhamento: veja a análise e responda as perguntas pendentes.
                  </p>
                </CardContent>
              </Card>
            ) : hasVoted ? (
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="pt-4">
                  <p className="text-blue-700 text-center">
                    Você já registrou seu voto: <strong>{myVote === 'approved' ? 'Aprovado' : 'Rejeitado'}</strong>
                  </p>
                </CardContent>
              </Card>
            ) : solicitation.approval_status === 'approved_released' || solicitation.approval_status === 'rejected' ? (
              <Card className="border-gray-200 bg-gray-50">
                <CardContent className="pt-4">
                  <p className="text-gray-700 text-center">
                    Esta solicitação já foi {solicitation.approval_status === 'approved_released' ? 'liberada' : 'rejeitada'}.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="justification">Justificativa (obrigatória para rejeição)</Label>
                <Textarea
                  id="justification"
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="Digite sua justificativa aqui..."
                  rows={3}
                />
              </div>
            )}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">Solicitação não encontrada</p>
        )}
        </div>

        {/* Footer fixo com ações principais */}
        {!loading && solicitation && (
          <div className="border-t bg-background px-6 py-3 shrink-0 flex flex-wrap items-center justify-end gap-2">
            {isVetoApprover &&
              solicitation.request_type !== 'internal_requisition' &&
              solicitation.approval_status !== 'pending_quotes' &&
              solicitation.approval_status !== 'delivered' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={scrollToVeto}
                  className="border-destructive/40 text-destructive hover:bg-destructive/10 mr-auto"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Reprovar e refazer orçamento
                </Button>
              )}

            {!readOnly && !hasVoted &&
              solicitation.approval_status !== 'approved_released' &&
              solicitation.approval_status !== 'rejected' && (
                <>
                  <Button
                    variant="destructive"
                    onClick={handleReject}
                    disabled={submitting}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Rejeitar
                  </Button>
                  <Button
                    onClick={handleApprove}
                    disabled={submitting}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Aprovar
                  </Button>
                </>
              )}

            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};