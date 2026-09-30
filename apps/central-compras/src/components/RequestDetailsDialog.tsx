import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge, RequesterStatusBadge } from "./StatusBadge";
import { QuotesUpload } from "./QuotesUpload";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Download, ExternalLink, FileText, Trash2, Edit, AlertTriangle, CheckCircle, XCircle, Zap, Printer, BellRing } from "lucide-react";
import { printRequisition } from "@/lib/printRequisition";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatDateOnly, parseDateOnly, todayLocalISO } from "@/lib/utils";
import { ApproverQuestions } from "@/components/ApproverQuestions";
import { SolicitationMessages } from "@/components/SolicitationMessages";

interface AccommodationGuest {
  name: string;
  cpf: string;
  birthDate: string;
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
  created_at: string;
  updated_at: string;
  requester_name: string;
  requester_email: string | null;
  requester_phone: string;
  request_type: string;
  general_description: string | null;
  product_name: string | null;
  product_quantity: number | null;
  product_link: string | null;
  product_observations: string | null;
  flight_origin: string | null;
  flight_destination: string | null;
  flight_departure_date: string | null;
  flight_return_date: string | null;
  flight_time: string | null;
  flight_preferred_airline: string | null;
  flight_estimated_value: number | null;
  flight_search_link: string | null;
  flight_observations: string | null;
  material_type: string | null;
  material_type_other: string | null;
  material_size: string | null;
  material_quantity: number | null;
  material_purpose: string | null;
  material_observations: string | null;
  // Accommodation fields
  accommodation_requester_cpf: string | null;
  accommodation_requester_birth_date: string | null;
  accommodation_destination_city: string | null;
  accommodation_destination_state: string | null;
  accommodation_guests_count: number | null;
  accommodation_guests_data: AccommodationGuest[] | null;
  accommodation_check_in: string | null;
  accommodation_check_out: string | null;
  accommodation_travel_reason: string | null;
  accommodation_event_address: string | null;
  accommodation_selected_hotel: string | null;
  accommodation_hotel_address: string | null;
  accommodation_hotel_contact: string | null;
  accommodation_admin_observation: string | null;
  // Status fields
  status: "pending" | "approved" | "rejected" | "purchasing" | "delivered";
  approval_status: string | null;
  admin_justification: string | null;
  estimated_arrival_date: string | null;
  actual_delivery_date: string | null;
  final_order_link: string | null;
  items_list: (ApostilaItem | ProductListItem)[] | null;
  veto_by: string | null;
  veto_reason: string | null;
  veto_at: string | null;
  veto_count: number | null;
  is_urgent?: boolean | null;
  urgency_justification?: string | null;
  // Internal requisition
  requisition_date?: string | null;
  return_deadline?: string | null;
  usage_purpose?: string | null;
  requesting_sector?: string | null;
  responsibility_accepted?: boolean | null;
  requester_signature_name?: string | null;
  requester_signature_data?: string | null;
  manager_signature_name?: string | null;
  manager_signature_data?: string | null;
  returned_at?: string | null;
}

interface Attachment {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string;
  attachment_type: string;
  solicitation_id: string;
  uploaded_by: string;
}

interface Quote {
  id: string;
  file_name: string;
  file_path: string;
  supplier_name: string | null;
  store_name?: string | null;
  value: number | null;
  product_name?: string | null;
}

interface RequestDetailsDialogProps {
  solicitationId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  adminMode?: boolean;
}

const requestTypeLabels: Record<string, string> = {
  product: "Produto",
  flight: "Passagem Aérea",
  personalized_material: "Material Personalizado",
  accommodation: "Reserva de Hospedagem",
  apostilas: "Apostilas",
  cleaning_product: "Produto de Limpeza",
  internal_requisition: "Requisição Interna",
};

const materialTypeLabels: Record<string, string> = {
  sticker: "Adesivo",
  banner: "Banner",
  folder: "Folder",
  flyer: "Flyer",
  other: "Outro",
};

export const RequestDetailsDialog = ({
  solicitationId,
  open,
  onOpenChange,
  onSuccess,
  adminMode = false,
}: RequestDetailsDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [solicitation, setSolicitation] = useState<Solicitation | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [approvedQuoteId, setApprovedQuoteId] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // Direct purchase conversion fields
  const [directOpen, setDirectOpen] = useState(false);
  const [directSupplier, setDirectSupplier] = useState("");
  const [directValue, setDirectValue] = useState("");
  const [directDate, setDirectDate] = useState(todayLocalISO());
  const [directJustification, setDirectJustification] = useState("");
  const [directFinalStatus, setDirectFinalStatus] = useState<"purchasing" | "delivered">("purchasing");
  const [directSubmitting, setDirectSubmitting] = useState(false);
  
  // Admin fields
  const [status, setStatus] = useState<Solicitation["status"]>("pending");
  const [adminJustification, setAdminJustification] = useState("");
  const [vetoApproverName, setVetoApproverName] = useState<string | null>(null);
  const [estimatedArrivalDate, setEstimatedArrivalDate] = useState("");
  const [actualDeliveryDate, setActualDeliveryDate] = useState("");
  const [finalOrderLink, setFinalOrderLink] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);
  const [editQuoteData, setEditQuoteData] = useState({ value: "", supplier_name: "", store_name: "", file_path: "" });
  const [savingQuote, setSavingQuote] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [editData, setEditData] = useState({
    product_name: "",
    product_quantity: 1,
    product_link: "",
    product_observations: "",
    general_description: "",
  });
  const [editItems, setEditItems] = useState<ProductListItem[]>([]);
  const [sendingReminder, setSendingReminder] = useState(false);

  const REMINDER_COOLDOWN_MS = 24 * 60 * 60 * 1000;

  const getReminderSentAt = (id: string | null): number | null => {
    if (!id) return null;
    try {
      const raw = localStorage.getItem(`approval-reminder-${id}`);
      const ts = raw ? parseInt(raw, 10) : NaN;
      return Number.isFinite(ts) ? ts : null;
    } catch {
      return null;
    }
  };

  const handleSendReminder = async () => {
    if (!solicitationId || !solicitation) return;
    setSendingReminder(true);
    try {
      const waitingDays0 = Math.max(
        0,
        Math.floor((Date.now() - new Date(solicitation.created_at).getTime()) / (24 * 60 * 60 * 1000))
      );

      // In-app reminder: post a message in the user channel so approvers see the red indicator
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        await supabase.from('solicitation_messages' as any).insert({
          solicitation_id: solicitationId,
          sender_id: currentUser.id,
          channel: 'user',
          message: `🔔 Lembrete do solicitante: esta solicitação aguarda aprovação${waitingDays0 > 0 ? ` há ${waitingDays0} ${waitingDays0 === 1 ? 'dia' : 'dias'}` : ''}. Por favor, revisem quando possível.`,
        });
      }
      const recipients = solicitation.request_type === 'internal_requisition'
        ? ['logistica@mkr.makergrupo.com.br']
        : [
            'controller@makergrupo.com.br',
            'ceo@makergrupo.com.br',
            'financeiro2@makergrupo.com.br',
            'financeiro@makergrupo.com.br',
          ];

      const waitingDays = Math.max(
        0,
        Math.floor((Date.now() - new Date(solicitation.created_at).getTime()) / (24 * 60 * 60 * 1000))
      );
      const dayKey = new Date().toISOString().slice(0, 10);

      await Promise.all(
        recipients.map((email) =>
          supabase.functions.invoke('send-transactional-email', {
            body: {
              templateName: 'approval-reminder',
              recipientEmail: email,
              idempotencyKey: `approval-reminder-${solicitationId}-${email}-${dayKey}`,
              templateData: {
                requesterName: solicitation.requester_name,
                requestType: solicitation.request_type,
                itemTitle: getItemTitle(solicitation),
                waitingDays,
                solicitationId,
              },
            },
          })
        )
      );

      localStorage.setItem(`approval-reminder-${solicitationId}`, String(Date.now()));
      toast.success("Lembrete enviado aos aprovadores!");
    } catch (error) {
      console.error('Erro ao enviar lembrete:', error);
      toast.error("Erro ao enviar lembrete");
    } finally {
      setSendingReminder(false);
    }
  };

  useEffect(() => {
    if (solicitationId && open) {
      loadSolicitation();
      (async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: roles } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id);
        setIsSuperAdmin(!!roles?.some((r: any) => r.role === 'super_admin'));
      })();
    }
  }, [solicitationId, open]);

  const loadSolicitation = async () => {
    if (!solicitationId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('solicitations')
        .select('*')
        .eq('id', solicitationId)
        .single();

      if (error) throw error;

      setSolicitation(data as unknown as Solicitation);
      setStatus(data.status as Solicitation["status"]);
      setAdminJustification(data.admin_justification || "");
      setEstimatedArrivalDate(data.estimated_arrival_date || "");
      setActualDeliveryDate(data.actual_delivery_date || "");
      setFinalOrderLink(data.final_order_link || "");

      // Load attachments
      const { data: attachmentsData, error: attachError } = await supabase
        .from('attachments')
        .select('*')
        .eq('solicitation_id', solicitationId);

      if (!attachError && attachmentsData) {
        setAttachments(attachmentsData);
      }

      // Load quotes
      const { data: quotesData, error: quotesError } = await supabase
        .from('quotes')
        .select('*')
        .eq('solicitation_id', solicitationId);

      if (!quotesError && quotesData) {
        setQuotes(quotesData);
      }

      // Load approved quote from approvals
      const { data: approvals } = await supabase
        .from('approvals')
        .select('selected_quote_id')
        .eq('solicitation_id', solicitationId)
        .eq('status', 'approved')
        .not('selected_quote_id', 'is', null);

      if (approvals && approvals.length > 0) {
        const voteCounts: Record<string, number> = {};
        approvals.forEach(a => {
          if (a.selected_quote_id) {
            voteCounts[a.selected_quote_id] = (voteCounts[a.selected_quote_id] || 0) + 1;
          }
        });
        const topQuoteId = Object.entries(voteCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
        setApprovedQuoteId(topQuoteId || null);
      } else {
        setApprovedQuoteId(null);
      }

      // Buscar nome do reprovador (veto), se houver
      if (data.veto_by) {
        const { data: name } = await (supabase.rpc as any)('get_approver_display_name', {
          _user_id: data.veto_by,
        });
        setVetoApproverName((name as string) || 'Aprovador');
      } else {
        setVetoApproverName(null);
      }
    } catch (error) {
      console.error('Erro ao carregar solicitação:', error);
      toast.error("Erro ao carregar solicitação");
    } finally {
      setLoading(false);
    }
  };

  const handleAdminUpdate = async () => {
    if (!solicitationId) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('solicitations')
        .update({
          status,
          admin_justification: adminJustification || null,
          estimated_arrival_date: estimatedArrivalDate || null,
          actual_delivery_date: actualDeliveryDate || null,
          final_order_link: finalOrderLink || null,
        })
        .eq('id', solicitationId);

      if (error) throw error;

      toast.success("Solicitação atualizada com sucesso!");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao atualizar solicitação:', error);
      toast.error("Erro ao atualizar solicitação");
    } finally {
      setLoading(false);
    }
  };

  const downloadAttachment = async (attachment: Attachment) => {
    try {
      const { data, error } = await supabase.storage
        .from('solicitation-attachments')
        .download(attachment.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.file_name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao baixar arquivo:', error);
      toast.error("Erro ao baixar arquivo");
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
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao baixar orçamento:', error);
      toast.error("Erro ao baixar orçamento");
    }
  };

  const handleDeleteSolicitation = async () => {
    if (!solicitationId) return;

    setLoading(true);
    try {
      // Delete quotes first
      await supabase.from('quotes').delete().eq('solicitation_id', solicitationId);
      
      // Delete attachments
      await supabase.from('attachments').delete().eq('solicitation_id', solicitationId);
      
      // Delete approvals
      await supabase.from('approvals').delete().eq('solicitation_id', solicitationId);
      
      // Delete status history
      await supabase.from('status_history').delete().eq('solicitation_id', solicitationId);

      // Finally delete the solicitation
      const { error } = await supabase
        .from('solicitations')
        .delete()
        .eq('id', solicitationId);

      if (error) throw error;

      toast.success("Solicitação excluída com sucesso!");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao excluir solicitação:', error);
      toast.error("Erro ao excluir solicitação");
    } finally {
      setLoading(false);
    }
  };

  const getItemTitle = (sol: Solicitation): string => {
    if (sol.request_type === "product") return sol.product_name || "Produto";
    if (sol.request_type === "flight") return `${sol.flight_origin || ""} → ${sol.flight_destination || ""}`;
    if (sol.request_type === "personalized_material") return sol.material_type || "Material";
    if (sol.request_type === "accommodation") return `Hospedagem em ${sol.accommodation_destination_city || ""}`;
    return "Solicitação";
  };

  const handleAdminReject = async () => {
    if (!solicitationId || !solicitation) return;
    if (!rejectReason.trim()) {
      toast.error("Informe o motivo da rejeição");
      return;
    }

    setRejecting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      // 1. Atualiza solicitação para rejeitada (encerrada)
      const { error: updateError } = await (supabase
        .from('solicitations') as any)
        .update({
          approval_status: 'rejected',
          status: 'rejected',
          admin_justification: rejectReason.trim(),
        })
        .eq('id', solicitationId);

      if (updateError) throw updateError;

      // 2. Auditoria no histórico
      const { data: actorName } = await (supabase.rpc as any)('get_approver_display_name', {
        _user_id: user.id,
      });
      await supabase.from('status_history').insert({
        solicitation_id: solicitationId,
        changed_by: user.id,
        old_status: solicitation.approval_status ?? null,
        new_status: 'admin_rejected',
        justification: rejectReason.trim(),
      });

      // 3. E-mail para o solicitante com o motivo
      if (solicitation.requester_email) {
        try {
          await supabase.functions.invoke('send-transactional-email', {
            body: {
              templateName: 'request-rejected',
              recipientEmail: solicitation.requester_email,
              idempotencyKey: `request-rejected-${solicitationId}-${Date.now()}`,
              templateData: {
                requesterName: solicitation.requester_name,
                requestType: solicitation.request_type,
                itemTitle: getItemTitle(solicitation),
                reason: rejectReason.trim(),
                rejectedByName: (actorName as string) || 'Administrador',
                solicitationId,
              },
            },
          });
        } catch (emailErr) {
          console.warn("Falha ao enviar e-mail de rejeição:", emailErr);
        }
      }

      toast.success("Solicitação rejeitada. Solicitante foi notificado por e-mail.");
      setRejectDialogOpen(false);
      setRejectReason("");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao rejeitar solicitação:", error);
      toast.error("Erro ao rejeitar solicitação");
    } finally {
      setRejecting(false);
    }
  };

  const startEditingQuote = (quote: Quote) => {
    setEditingQuoteId(quote.id);
    setEditQuoteData({
      value: quote.value ? String(quote.value) : "",
      supplier_name: quote.supplier_name || "",
      store_name: quote.store_name || "",
      file_path: quote.file_path || "",
    });
  };

  const handleSaveQuote = async () => {
    if (!editingQuoteId) return;
    setSavingQuote(true);
    try {
      const { error } = await supabase
        .from('quotes')
        .update({
          value: editQuoteData.value ? parseFloat(editQuoteData.value.replace(',', '.')) : null,
          supplier_name: editQuoteData.supplier_name || null,
          store_name: editQuoteData.store_name || null,
          file_path: editQuoteData.file_path || quotes.find(q => q.id === editingQuoteId)?.file_path || '',
        })
        .eq('id', editingQuoteId);
      if (error) throw error;
      toast.success("Orçamento atualizado!");
      setEditingQuoteId(null);
      loadSolicitation();
    } catch (error) {
      console.error('Erro ao atualizar orçamento:', error);
      toast.error("Erro ao atualizar orçamento");
    } finally {
      setSavingQuote(false);
    }
  };

  const handleDeleteQuote = async (quote: Quote) => {
    if (!confirm(`Excluir Orçamento${quote.product_name ? ` de "${quote.product_name}"` : ""}? Essa ação não pode ser desfeita.`)) return;
    try {
      // Remove arquivo do storage se houver
      if (quote.file_path && !quote.file_path.startsWith('http') && quote.file_path !== 'Sem link') {
        await supabase.storage.from('solicitation-attachments').remove([quote.file_path]);
      }
      const { error } = await supabase.from('quotes').delete().eq('id', quote.id);
      if (error) throw error;
      toast.success("Orçamento excluído!");
      loadSolicitation();
    } catch (error) {
      console.error('Erro ao excluir orçamento:', error);
      toast.error("Erro ao excluir orçamento");
    }
  };

  const startEditing = () => {
    if (solicitation) {
      setEditData({
        product_name: solicitation.product_name || "",
        product_quantity: solicitation.product_quantity || 1,
        product_link: solicitation.product_link || "",
        product_observations: solicitation.product_observations || "",
        general_description: solicitation.general_description || "",
      });
      const existing = (solicitation.items_list as ProductListItem[] | null) || [];
      if (existing.length > 0) {
        setEditItems(existing.map(it => ({
          name: it.name || "",
          quantity: it.quantity || 1,
          link: it.link || "",
          observations: it.observations || "",
        })));
      } else {
        setEditItems([{
          name: solicitation.product_name || "",
          quantity: solicitation.product_quantity || 1,
          link: solicitation.product_link || "",
          observations: solicitation.product_observations || "",
        }]);
      }
      setIsEditing(true);
    }
  };

  const handleUserUpdate = async () => {
    if (!solicitationId) return;

    setLoading(true);
    try {
      let updatePayload: any = {
        general_description: editData.general_description,
        updated_at: new Date().toISOString(),
        approval_status: 'pending_quotes',
        status: 'pending',
      };

      if (solicitation?.request_type === 'product') {
        const validItems = editItems
          .filter(it => (it.name || "").trim() !== "")
          .map(it => ({
            name: it.name.trim(),
            quantity: Number(it.quantity) || 1,
            link: (it.link || "").trim() || null,
            observations: (it.observations || "").trim() || null,
          }));

        if (validItems.length === 0) {
          toast.error("Adicione pelo menos um produto com nome");
          setLoading(false);
          return;
        }

        updatePayload = {
          ...updatePayload,
          product_name: validItems[0].name,
          product_quantity: validItems[0].quantity,
          product_link: validItems[0].link,
          product_observations: validItems[0].observations,
          items_list: validItems,
        };
      } else {
        updatePayload = {
          ...updatePayload,
          product_name: editData.product_name,
          product_quantity: editData.product_quantity,
          product_link: editData.product_link,
          product_observations: editData.product_observations,
        };
      }

      const { error } = await supabase
        .from('solicitations')
        .update(updatePayload)
        .eq('id', solicitationId);

      if (error) throw error;

      toast.success("Solicitação atualizada! Sua solicitação voltou para a fila.");
      setIsEditing(false);
      onSuccess();
      loadSolicitation();
    } catch (error) {
      console.error('Erro ao atualizar solicitação:', error);
      toast.error("Erro ao atualizar solicitação");
    } finally {
      setLoading(false);
    }
  };

  if (!solicitation) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3 pr-8">
            <DialogTitle>Detalhes da Solicitação #{solicitation.id.slice(0, 8)}</DialogTitle>
            {solicitation.request_type === 'internal_requisition' && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => printRequisition(solicitation as any)}
              >
                <Printer className="h-4 w-4 mr-2" />
                Imprimir
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações Gerais */}
          <div className="p-4 bg-secondary/50 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Informações Gerais</h3>
              {adminMode ? (
                <StatusBadge status={solicitation.status} />
              ) : (
                <RequesterStatusBadge
                  status={solicitation.status}
                  approvalStatus={solicitation.approval_status}
                  requestType={solicitation.request_type}
                />
              )}
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Solicitante:</span>
                <p className="font-medium">{solicitation.requester_name}</p>
              </div>
              <div>
                <span className="text-muted-foreground">E-mail:</span>
                <p className="font-medium">{solicitation.requester_email || "—"}</p>
              </div>
              {solicitation.requester_phone && (
                <div>
                  <span className="text-muted-foreground">Telefone:</span>
                  <p className="font-medium">{solicitation.requester_phone}</p>
                </div>
              )}
              <div>
                <span className="text-muted-foreground">Tipo:</span>
                <p className="font-medium">{requestTypeLabels[solicitation.request_type]}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Data de criação:</span>
                <p className="font-medium">
                  {format(new Date(solicitation.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
            </div>
            {solicitation.general_description && (
              <div>
                <span className="text-muted-foreground text-sm">Descrição:</span>
                <p className="text-sm mt-1">{solicitation.general_description}</p>
              </div>
            )}
            {solicitation.is_urgent && (
              <div className="p-3 rounded-lg border border-red-500/40 bg-red-500/10">
                <span className="text-sm font-semibold text-red-500">🚨 Pedido urgente</span>
                {solicitation.urgency_justification && (
                  <p className="text-sm mt-1 text-red-500/90">
                    <span className="font-medium">Justificativa da urgência:</span>{" "}
                    {solicitation.urgency_justification}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Aviso de reprovação (veto) — refazer orçamentos */}
          {solicitation.veto_at && solicitation.veto_reason && (
            <div className="p-4 rounded-lg border-2 border-destructive/40 bg-destructive/5 space-y-2">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-destructive" />
                <h3 className="font-semibold text-destructive">
                  Solicitação reprovada — refazer orçamentos
                </h3>
              </div>
              <div className="text-sm space-y-1">
                <p>
                  <span className="text-muted-foreground">Reprovado por:</span>{" "}
                  <span className="font-medium">{vetoApproverName || "Aprovador"}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Data:</span>{" "}
                  <span className="font-medium">
                    {format(new Date(solicitation.veto_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </span>
                </p>
                {solicitation.veto_count && solicitation.veto_count > 1 && (
                  <p className="text-xs text-muted-foreground">
                    Esta solicitação já foi reprovada {solicitation.veto_count}x.
                  </p>
                )}
              </div>
              <div className="mt-2 p-3 bg-background rounded border border-destructive/20">
                <p className="text-xs text-muted-foreground mb-1">Motivo / observação:</p>
                <p className="text-sm whitespace-pre-wrap break-words italic">
                  "{solicitation.veto_reason}"
                </p>
              </div>
            </div>
          )}

          {/* Informações de Entrega - Visível para todos */}
          {(solicitation.estimated_arrival_date || solicitation.actual_delivery_date || solicitation.admin_justification) && (
            <div className="p-4 bg-primary/10 rounded-lg space-y-3">
              <h3 className="font-semibold text-primary">Informações de Entrega</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {solicitation.estimated_arrival_date && (
                  <div>
                    <span className="text-muted-foreground">Previsão de Chegada:</span>
                    <p className="font-medium">
                      {formatDateOnly(solicitation.estimated_arrival_date)}
                    </p>
                  </div>
                )}
                {solicitation.actual_delivery_date && (
                  <div>
                    <span className="text-muted-foreground">Data de Entrega:</span>
                    <p className="font-medium">
                      {formatDateOnly(solicitation.actual_delivery_date)}
                    </p>
                  </div>
                )}
              </div>
              {solicitation.admin_justification && (
                <div>
                  <span className="text-muted-foreground text-sm">Observações do Administrador:</span>
                  <p className="text-sm mt-1">{solicitation.admin_justification}</p>
                </div>
              )}
              {solicitation.final_order_link && (
                <div>
                  <span className="text-muted-foreground text-sm">Link do Pedido:</span>
                  <a
                    href={solicitation.final_order_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1 text-sm mt-1"
                  >
                    {solicitation.final_order_link}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Detalhes específicos por tipo */}
          {solicitation.request_type === "product" && (
            <div className="p-4 bg-secondary/50 rounded-lg space-y-3">
              <h3 className="font-semibold">Detalhes do Produto</h3>
              {solicitation.items_list && (solicitation.items_list as ProductListItem[]).length > 0 ? (
                <div className="space-y-2">
                  {(solicitation.items_list as ProductListItem[]).map((item, index) => (
                    <div key={index} className="p-3 bg-background rounded border space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-sm">{item.name}</span>
                        <span className="text-muted-foreground text-sm">Qtd: {item.quantity}</span>
                      </div>
                      {item.link && (
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                          className="mt-1"
                        >
                          <a
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Abrir link
                          </a>
                        </Button>
                      )}
                      {item.observations && (
                        <p className="text-sm text-muted-foreground">{item.observations}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Produto:</span>
                      <p className="font-medium">{solicitation.product_name}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Quantidade:</span>
                      <p className="font-medium">{solicitation.product_quantity}</p>
                    </div>
                  </div>
                  {solicitation.product_link && (
                    <div>
                      <span className="text-muted-foreground text-sm">Link:</span>
                      <div className="mt-1">
                        <Button variant="outline" size="sm" asChild>
                          <a
                            href={solicitation.product_link}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Abrir link
                          </a>
                        </Button>
                      </div>
                    </div>
                  )}
                  {solicitation.product_observations && (
                    <div>
                      <span className="text-muted-foreground text-sm">Observações:</span>
                      <p className="text-sm mt-1">{solicitation.product_observations}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {solicitation.request_type === "flight" && (
            <div className="p-4 bg-secondary/50 rounded-lg space-y-3">
              <h3 className="font-semibold">Detalhes da Passagem</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Origem:</span>
                  <p className="font-medium">{solicitation.flight_origin}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Destino:</span>
                  <p className="font-medium">{solicitation.flight_destination}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Data de Ida:</span>
                  <p className="font-medium">
                    {formatDateOnly(solicitation.flight_departure_date)}
                  </p>
                </div>
                {solicitation.flight_return_date && (
                  <div>
                    <span className="text-muted-foreground">Data de Volta:</span>
                    <p className="font-medium">
                      {formatDateOnly(solicitation.flight_return_date)}
                    </p>
                  </div>
                )}
                {solicitation.flight_time && (
                  <div>
                    <span className="text-muted-foreground">Horário:</span>
                    <p className="font-medium">{solicitation.flight_time}</p>
                  </div>
                )}
                {solicitation.flight_preferred_airline && (
                  <div>
                    <span className="text-muted-foreground">Companhia:</span>
                    <p className="font-medium">{solicitation.flight_preferred_airline}</p>
                  </div>
                )}
                {solicitation.flight_estimated_value && (
                  <div>
                    <span className="text-muted-foreground">Valor Estimado:</span>
                    <p className="font-medium">{solicitation.flight_estimated_value}</p>
                  </div>
                )}
              </div>
              {solicitation.flight_search_link && (
                <div>
                  <span className="text-muted-foreground text-sm">Link da Pesquisa:</span>
                  <a
                    href={solicitation.flight_search_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1 text-sm mt-1"
                  >
                    {solicitation.flight_search_link}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}
              {solicitation.flight_observations && (
                <div>
                  <span className="text-muted-foreground text-sm">Observações:</span>
                  <p className="text-sm mt-1">{solicitation.flight_observations}</p>
                </div>
              )}
            </div>
          )}

          {solicitation.request_type === "personalized_material" && (
            <div className="p-4 bg-secondary/50 rounded-lg space-y-3">
              <h3 className="font-semibold">Detalhes do Material</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Tipo:</span>
                  <p className="font-medium">
                    {solicitation.material_type && materialTypeLabels[solicitation.material_type]}
                    {solicitation.material_type === "other" && solicitation.material_type_other && ` - ${solicitation.material_type_other}`}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Quantidade:</span>
                  <p className="font-medium">{solicitation.material_quantity}</p>
                </div>
                {solicitation.material_size && (
                  <div>
                    <span className="text-muted-foreground">Tamanho:</span>
                    <p className="font-medium">{solicitation.material_size}</p>
                  </div>
                )}
                {solicitation.material_purpose && (
                  <div>
                    <span className="text-muted-foreground">Finalidade:</span>
                    <p className="font-medium">{solicitation.material_purpose}</p>
                  </div>
                )}
              </div>
              {solicitation.material_observations && (
                <div>
                  <span className="text-muted-foreground text-sm">Observações:</span>
                  <p className="text-sm mt-1">{solicitation.material_observations}</p>
                </div>
              )}
            </div>
          )}

          {/* Detalhes de Hospedagem */}
          {solicitation.request_type === "accommodation" && (
            <div className="space-y-4">
              {/* Dados do Solicitante */}
              <div className="p-4 bg-secondary/50 rounded-lg space-y-3">
                <h3 className="font-semibold">Dados do Solicitante (Responsável)</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {solicitation.accommodation_requester_cpf && (
                    <div>
                      <span className="text-muted-foreground">CPF:</span>
                      <p className="font-medium">{solicitation.accommodation_requester_cpf}</p>
                    </div>
                  )}
                  {solicitation.accommodation_requester_birth_date && (
                    <div>
                      <span className="text-muted-foreground">Data de Nascimento:</span>
                      <p className="font-medium">
                        {formatDateOnly(solicitation.accommodation_requester_birth_date)}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Destino e Datas */}
              <div className="p-4 bg-secondary/50 rounded-lg space-y-3">
                <h3 className="font-semibold">Destino e Datas</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Destino:</span>
                    <p className="font-medium">
                      {solicitation.accommodation_destination_city}, {solicitation.accommodation_destination_state}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Check-in:</span>
                    <p className="font-medium">
                      {formatDateOnly(solicitation.accommodation_check_in)}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Check-out:</span>
                    <p className="font-medium">
                      {formatDateOnly(solicitation.accommodation_check_out)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Hóspedes */}
              {solicitation.accommodation_guests_data && solicitation.accommodation_guests_data.length > 0 && (
                <div className="p-4 bg-secondary/50 rounded-lg space-y-3">
                  <h3 className="font-semibold">
                    Pessoas que Irão se Hospedar ({solicitation.accommodation_guests_count || solicitation.accommodation_guests_data.length})
                  </h3>
                  <div className="space-y-2">
                    {solicitation.accommodation_guests_data.map((guest, index) => (
                      <div key={index} className="p-3 bg-background rounded border text-sm">
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <span className="text-muted-foreground">Nome:</span>
                            <p className="font-medium">{guest.name}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">CPF:</span>
                            <p className="font-medium">{guest.cpf}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Nascimento:</span>
                            <p className="font-medium">
                              {formatDateOnly(guest.birthDate)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Motivo e Endereço do Evento */}
              <div className="p-4 bg-secondary/50 rounded-lg space-y-3">
                <h3 className="font-semibold">Informações da Viagem</h3>
                {solicitation.accommodation_travel_reason && (
                  <div>
                    <span className="text-muted-foreground text-sm">Motivo da Viagem:</span>
                    <p className="text-sm mt-1">{solicitation.accommodation_travel_reason}</p>
                  </div>
                )}
                {solicitation.accommodation_event_address && (
                  <div>
                    <span className="text-muted-foreground text-sm">Endereço de Referência:</span>
                    <p className="text-sm mt-1">{solicitation.accommodation_event_address}</p>
                  </div>
                )}
              </div>

              {/* Informações do Hotel (após aprovação) */}
              {(solicitation.accommodation_selected_hotel || solicitation.accommodation_hotel_address || solicitation.accommodation_hotel_contact) && (
                <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800 space-y-3">
                  <h3 className="font-semibold text-green-800 dark:text-green-300">Hospedagem Reservada</h3>
                  <div className="grid grid-cols-1 gap-3 text-sm">
                    {solicitation.accommodation_selected_hotel && (
                      <div>
                        <span className="text-muted-foreground">Hotel/Casa:</span>
                        <p className="font-medium">{solicitation.accommodation_selected_hotel}</p>
                      </div>
                    )}
                    {solicitation.accommodation_hotel_address && (
                      <div>
                        <span className="text-muted-foreground">Endereço:</span>
                        <p className="font-medium">{solicitation.accommodation_hotel_address}</p>
                      </div>
                    )}
                    {solicitation.accommodation_hotel_contact && (
                      <div>
                        <span className="text-muted-foreground">Contato:</span>
                        <p className="font-medium">{solicitation.accommodation_hotel_contact}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Observação do Admin */}
              {solicitation.accommodation_admin_observation && (
                <div className="p-4 bg-primary/10 rounded-lg">
                  <span className="text-muted-foreground text-sm">Observação do Administrador:</span>
                  <p className="text-sm mt-1">{solicitation.accommodation_admin_observation}</p>
                </div>
              )}
            </div>
          )}

          {/* Detalhes de Produtos de Limpeza */}
          {solicitation.request_type === "cleaning_product" && solicitation.items_list && (
            <div className="p-4 bg-secondary/50 rounded-lg space-y-3">
              <h3 className="font-semibold">Lista de Produtos de Limpeza</h3>
              <div className="space-y-2">
                {solicitation.items_list.map((item, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-background rounded border text-sm">
                    <span className="font-medium">{item.name}</span>
                    <span className="text-muted-foreground">Qtd: {item.quantity}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                A cotação é feita pelo valor total da lista em cada loja (3 orçamentos), não por item.
              </p>
              {solicitation.product_observations && (
                <div>
                  <span className="text-muted-foreground text-sm">Observações:</span>
                  <p className="text-sm mt-1">{solicitation.product_observations}</p>
                </div>
              )}
            </div>
          )}

          {/* Detalhes de Apostilas */}
          {solicitation.request_type === "apostilas" && solicitation.items_list && (
            <div className="p-4 bg-secondary/50 rounded-lg space-y-3">
              <h3 className="font-semibold">Lista de Apostilas</h3>
              <div className="space-y-2">
                {solicitation.items_list.map((item, index) => (
                  <div key={index} className="flex justify-between items-center p-2 bg-background rounded border text-sm">
                    <span className="font-medium">{item.name}</span>
                    <span className="text-muted-foreground">Qtd: {item.quantity}</span>
                  </div>
                ))}
              </div>
              {solicitation.product_observations && (
                <div>
                  <span className="text-muted-foreground text-sm">Observações:</span>
                  <p className="text-sm mt-1">{solicitation.product_observations}</p>
                </div>
              )}
            </div>
          )}



          {/* Detalhes de Requisição Interna */}
          {solicitation.request_type === "internal_requisition" && (
            <div className="p-4 bg-secondary/50 rounded-lg space-y-4">
              <h3 className="font-semibold">Requisição de Produtos Internos</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Data da Solicitação</span>
                  <p className="font-medium">{formatDateOnly(solicitation.requisition_date)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Prazo para Devolução</span>
                  <p className={`font-medium ${parseDateOnly(solicitation.return_deadline) && !solicitation.returned_at && parseDateOnly(solicitation.return_deadline)! < new Date() ? "text-destructive" : ""}`}>
                    {formatDateOnly(solicitation.return_deadline)}
                    {parseDateOnly(solicitation.return_deadline) && !solicitation.returned_at && parseDateOnly(solicitation.return_deadline)! < new Date() && (
                      <span className="ml-2 text-xs">(ATRASADA)</span>
                    )}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Setor Solicitante</span>
                  <p className="font-medium">{solicitation.requesting_sector || "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status de Devolução</span>
                  <p className="font-medium">{solicitation.returned_at ? `Devolvido em ${format(new Date(solicitation.returned_at), "dd/MM/yyyy", { locale: ptBR })}` : "Em posse do solicitante"}</p>
                </div>
              </div>
              <div>
                <span className="text-muted-foreground text-sm">Finalidade de Uso</span>
                <p className="text-sm mt-1 whitespace-pre-wrap">{solicitation.usage_purpose || "—"}</p>
              </div>

              {(solicitation as any).missing_items_note && (
                <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-3 text-sm space-y-1">
                  <p className="font-semibold text-amber-900 dark:text-amber-200">
                    ⚠️ Peças faltantes reportadas pelo estoque
                  </p>
                  <p className="text-amber-900 dark:text-amber-200 whitespace-pre-wrap">
                    {(solicitation as any).missing_items_note}
                  </p>
                  {(solicitation as any).missing_items_reported_at && (
                    <p className="text-xs text-muted-foreground">
                      Reportado por {(solicitation as any).missing_items_reported_by || "estoque"} em{" "}
                      {format(new Date((solicitation as any).missing_items_reported_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  )}
                  <p className="text-xs text-amber-800 dark:text-amber-300">
                    Verifique o PDF marcado nos anexos abaixo.
                  </p>
                </div>
              )}


              {solicitation.items_list && solicitation.items_list.length > 0 && (
                <div>
                  <span className="text-muted-foreground text-sm">Produtos Requisitados</span>
                  <div className="space-y-2 mt-2">
                    {(solicitation.items_list as ProductListItem[]).map((item, index) => (
                      <div key={index} className="p-2 bg-background rounded border text-sm">
                        <div className="flex justify-between">
                          <span className="font-medium">{item.name}</span>
                          <span className="text-muted-foreground">Qtd: {item.quantity}</span>
                        </div>
                        {item.observations && <p className="text-xs text-muted-foreground mt-1">{item.observations}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-3 rounded border bg-background">
                <p className="text-xs text-muted-foreground mb-2">Termo de Responsabilidade</p>
                <p className="text-sm">
                  {solicitation.responsibility_accepted ? "✓ Aceito pelo solicitante" : "Não aceito"}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 rounded border bg-background space-y-2">
                  <p className="text-xs text-muted-foreground">Assinatura do Funcionário Solicitante</p>
                  <p className="text-sm font-medium">{solicitation.requester_signature_name || "—"}</p>
                  {solicitation.requester_signature_data ? (
                    <img src={solicitation.requester_signature_data} alt="Assinatura do solicitante" className="max-h-24 border-t pt-2" />
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Sem assinatura</p>
                  )}
                </div>
                <div className="p-3 rounded border bg-background space-y-2">
                  <p className="text-xs text-muted-foreground">Assinatura do Gerente Responsável</p>
                  <p className="text-sm font-medium">{solicitation.manager_signature_name || "—"}</p>
                  {solicitation.manager_signature_data ? (
                    <img src={solicitation.manager_signature_data} alt="Assinatura do gerente" className="max-h-24 border-t pt-2" />
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Aguardando aprovação</p>
                  )}
                </div>
              </div>

              {adminMode && !solicitation.returned_at && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    if (!solicitationId) return;
                    const { error } = await supabase
                      .from('solicitations')
                      .update({ returned_at: new Date().toISOString() })
                      .eq('id', solicitationId);
                    if (error) { toast.error("Erro ao marcar devolução"); return; }
                    toast.success("Devolução registrada!");
                    loadSolicitation();
                    onSuccess();
                  }}
                >
                  <CheckCircle className="mr-2 h-4 w-4" /> Marcar como Devolvido
                </Button>
              )}
            </div>
          )}

          {attachments.length > 0 && (
            <div className="p-4 bg-secondary/50 rounded-lg space-y-3">
              <h3 className="font-semibold">Anexos</h3>
              <div className="space-y-2">
                {attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center justify-between p-2 bg-background rounded"
                  >
                    <span className="text-sm truncate flex-1">{attachment.file_name}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => downloadAttachment(attachment)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Seção de Orçamentos - apenas para admin (não para apostilas) */}
          {adminMode && solicitation.request_type !== 'apostilas' && (
            <div className="p-4 bg-secondary/50 rounded-lg space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Orçamentos ({quotes.length} anexado(s))
              </h3>
              
              {/* Orçamentos existentes */}
              {quotes.length > 0 && (
                <div className="space-y-2">
                  {quotes.map((quote, index) => {
                    const isApproved = approvedQuoteId === quote.id;
                    const isEditingThis = editingQuoteId === quote.id;
                    return (
                    <div
                      key={quote.id}
                      className={`p-3 rounded border ${
                        isApproved 
                          ? 'bg-green-50 dark:bg-green-950/30 border-green-300 dark:border-green-700' 
                          : 'bg-background'
                      }`}
                    >
                      {isEditingThis ? (
                        <div className="space-y-3">
                          <p className="font-medium text-sm">Editando Orçamento {index + 1}</p>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label className="text-xs">Link (opcional)</Label>
                              <Input
                                placeholder="https://..."
                                value={editQuoteData.file_path}
                                onChange={(e) => setEditQuoteData(prev => ({ ...prev, file_path: e.target.value }))}
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Valor (R$)</Label>
                              <Input
                                placeholder="0,00"
                                value={editQuoteData.value}
                                onChange={(e) => setEditQuoteData(prev => ({ ...prev, value: e.target.value }))}
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Nome da Loja / Fornecedor</Label>
                            <Input
                              placeholder="Ex: Loja do Zé, Amazon..."
                              value={editQuoteData.store_name}
                              onChange={(e) => setEditQuoteData(prev => ({ ...prev, store_name: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Observação</Label>
                            <Input
                              placeholder="Observações..."
                              value={editQuoteData.supplier_name}
                              onChange={(e) => setEditQuoteData(prev => ({ ...prev, supplier_name: e.target.value }))}
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" onClick={handleSaveQuote} disabled={savingQuote}>
                              {savingQuote ? "Salvando..." : "Salvar"}
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingQuoteId(null)}>
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-sm flex items-center gap-2 flex-wrap">
                              Orçamento {index + 1}
                              {quote.product_name && (
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                                  {quote.product_name}
                                </span>
                              )}
                              {isApproved && (
                                <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/50 px-2 py-0.5 rounded-full">
                                  <CheckCircle className="h-3 w-3" /> Aprovado
                                </span>
                              )}
                            </p>
                            {quote.file_path.startsWith('http') ? (
                              <a 
                                href={quote.file_path} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs text-primary hover:underline flex items-center gap-1"
                              >
                                Ver link <ExternalLink className="h-3 w-3" />
                              </a>
                            ) : quote.file_name !== 'Link' && quote.file_path !== 'Sem link' ? (
                              <p className="text-xs text-muted-foreground">{quote.file_name}</p>
                            ) : (
                              <p className="text-xs text-muted-foreground">Sem arquivo anexado</p>
                            )}
                            {quote.store_name && (
                              <p className="text-xs font-semibold text-foreground">🏪 {quote.store_name}</p>
                            )}
                            {quote.supplier_name && (
                              <p className="text-xs text-muted-foreground">Obs: {quote.supplier_name}</p>
                            )}
                            {quote.value && (
                              <p className="text-xs font-medium text-primary">
                                R$ {quote.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </p>
                            )}
                            {adminMode && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteQuote(quote)}
                                title="Excluir orçamento"
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => startEditingQuote(quote)}
                              title="Editar orçamento"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {!quote.file_path.startsWith('http') && quote.file_name !== 'Link' && quote.file_path !== 'Sem link' && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => downloadQuote(quote)}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    );
                  })}
                </div>
              )}

              {/* Upload de orçamentos */}
              {(() => {
                const productItems =
                  solicitation.request_type === "product" && solicitation.items_list && (solicitation.items_list as ProductListItem[]).length > 0
                    ? (solicitation.items_list as ProductListItem[]).map((i) => ({ name: i.name, quantity: i.quantity }))
                    : undefined;
                const isMulti = !!productItems && productItems.length > 1;
                const existingByProduct: Record<string, number> = {};
                if (isMulti) {
                  productItems!.forEach((p) => {
                    existingByProduct[p.name] = quotes.filter((q) => q.product_name === p.name).length;
                  });
                }
                const maxTotal = isMulti ? productItems!.length * 3 : 3;
                const allFull = isMulti
                  ? productItems!.every((p) => (existingByProduct[p.name] ?? 0) >= 3)
                  : quotes.length >= 3;

                if (allFull) {
                  return (
                    <p className="text-sm text-green-600 font-medium">
                      ✓ Orçamentos completos ({quotes.length}/{maxTotal}) — limite máximo atingido.
                    </p>
                  );
                }

                return (
                  <QuotesUpload
                    solicitationId={solicitation.id}
                    existingCount={quotes.length}
                    isAdmin={adminMode}
                    onSuccess={loadSolicitation}
                    requestType={solicitation.request_type}
                    productItems={productItems}
                    existingByProduct={isMulti ? existingByProduct : undefined}
                  />
                );
              })()}
            </div>
          )}

          {/* Confirmação de recebimento para apostilas - admin */}
          {adminMode && solicitation.request_type === 'apostilas' && solicitation.approval_status === 'pending_quotes' && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800 space-y-3">
              <h3 className="font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Confirmar Recebimento da Solicitação
              </h3>
              <p className="text-sm text-amber-700 dark:text-amber-400">
                Apostilas não necessitam de orçamento. Confirme o recebimento para encaminhar diretamente à gráfica parceira.
              </p>
              <Button
                onClick={async () => {
                  setLoading(true);
                  try {
                    const { error } = await supabase
                      .from('solicitations')
                      .update({
                        approval_status: 'approved_released',
                        status: 'purchasing',
                        released_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                      })
                      .eq('id', solicitation.id);
                    if (error) throw error;
                    toast.success("Solicitação confirmada e encaminhada para a gráfica!");
                    onSuccess();
                    loadSolicitation();
                  } catch (error) {
                    console.error('Erro:', error);
                    toast.error("Erro ao confirmar solicitação");
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="w-full"
              >
                {loading ? "Confirmando..." : "✅ Confirmar Recebimento e Enviar para Gráfica"}
              </Button>
            </div>
          )}

          {adminMode && solicitation.request_type === 'apostilas' && solicitation.approval_status !== 'pending_quotes' && (
            <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                ✅ Solicitação confirmada — Encaminhada para a gráfica parceira.
              </p>
            </div>
          )}

          {/* Perguntas dos aprovadores — admins podem responder */}
          {solicitation && (
            <ApproverQuestions
              solicitationId={solicitation.id}
              canAnswer={true}
              canAsk={false}
              requesterName={solicitation.requester_name}
              requestType={solicitation.request_type}
            />
          )}


          {/* Chat de mensagens */}
          {solicitation && (
            <SolicitationMessages
              solicitationId={solicitation.id}
              isStaff={adminMode}
              isRequester={!adminMode}
            />
          )}




          {/* Compra Direta (super_admin) — pula aprovação */}
          {adminMode && isSuperAdmin &&
            solicitation.approval_status !== 'delivered' &&
            solicitation.status !== 'delivered' &&
            solicitation.approval_status !== 'rejected' && (
            <div className="p-4 bg-destructive/5 rounded-lg border border-destructive/30 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-destructive flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Lançar como Compra Direta
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Pula o fluxo de aprovação e registra a compra realizada diretamente por você.
                  </p>
                </div>
                {!directOpen && (
                  <Button variant="destructive" size="sm" onClick={() => setDirectOpen(true)}>
                    Lançar Compra Direta
                  </Button>
                )}
              </div>

              {directOpen && (
                <div className="space-y-3 pt-2 border-t border-destructive/20">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="dp-sup">Fornecedor *</Label>
                      <Input id="dp-sup" value={directSupplier} onChange={(e) => setDirectSupplier(e.target.value)} placeholder="Ex: Leroy Merlin" />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="dp-val">Valor (R$) *</Label>
                      <Input id="dp-val" inputMode="decimal" value={directValue} onChange={(e) => setDirectValue(e.target.value)} placeholder="0,00" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="dp-dt">Data da compra *</Label>
                    <Input id="dp-dt" type="date" value={directDate} onChange={(e) => setDirectDate(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="dp-just">Justificativa da urgência *</Label>
                    <Textarea id="dp-just" rows={2} value={directJustification} onChange={(e) => setDirectJustification(e.target.value)} placeholder="Motivo da compra direta sem aprovação" />
                  </div>
                  <div className="space-y-1">
                    <Label>Status do lançamento *</Label>
                    <div className="flex gap-4 text-sm">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" checked={directFinalStatus === 'purchasing'} onChange={() => setDirectFinalStatus('purchasing')} />
                        Em Compra
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" checked={directFinalStatus === 'delivered'} onChange={() => setDirectFinalStatus('delivered')} />
                        Entregue
                      </label>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={() => setDirectOpen(false)} disabled={directSubmitting}>
                      Cancelar
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={directSubmitting}
                      onClick={async () => {
                        if (!directSupplier.trim() || !directValue.trim() || !directJustification.trim() || !directDate) {
                          toast.error("Preencha todos os campos obrigatórios.");
                          return;
                        }
                        const num = parseFloat(directValue.replace(',', '.'));
                        if (isNaN(num) || num <= 0) {
                          toast.error("Valor inválido.");
                          return;
                        }
                        setDirectSubmitting(true);
                        try {
                          const { data: { user } } = await supabase.auth.getUser();
                          if (!user) throw new Error("Não autenticado");

                          const newApprovalStatus = directFinalStatus === 'delivered' ? 'delivered' : 'approved_released';
                          const { error } = await supabase
                            .from('solicitations')
                            .update({
                              is_direct_purchase: true,
                              direct_purchase_supplier: directSupplier.trim(),
                              direct_purchase_value: num,
                              direct_purchase_date: directDate,
                              is_urgent: true,
                              urgency_justification: directJustification.trim(),
                              approval_status: newApprovalStatus,
                              status: directFinalStatus,
                              approved_count: 2,
                              released_at: new Date().toISOString(),
                              actual_delivery_date: directFinalStatus === 'delivered' ? directDate : null,
                              updated_at: new Date().toISOString(),
                            })
                            .eq('id', solicitation.id);
                          if (error) throw error;

                          await supabase.from('status_history').insert({
                            solicitation_id: solicitation.id,
                            old_status: solicitation.approval_status ?? null,
                            new_status: `direct_purchase_${directFinalStatus}`,
                            changed_by: user.id,
                            justification: `Compra direta lançada (sem aprovação). Fornecedor: ${directSupplier.trim()} · Valor: R$ ${num.toFixed(2)} · Motivo: ${directJustification.trim()}`,
                          });

                          toast.success("Compra direta registrada.");
                          setDirectOpen(false);
                          setDirectSupplier("");
                          setDirectValue("");
                          setDirectJustification("");
                          setDirectFinalStatus("purchasing");
                          onSuccess();
                          loadSolicitation();
                        } catch (e: any) {
                          console.error(e);
                          toast.error(e.message || "Erro ao registrar compra direta.");
                        } finally {
                          setDirectSubmitting(false);
                        }
                      }}
                    >
                      {directSubmitting ? "Registrando..." : "Confirmar Compra Direta"}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {!adminMode && (
            <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
              <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">Status do Pedido</h3>
              {solicitation.approval_status === 'pending_quotes' && solicitation.request_type === 'apostilas' && (
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  ⏳ Aguardando confirmação — O administrador irá confirmar o recebimento da solicitação.
                </p>
              )}
              {solicitation.approval_status === 'pending_quotes' && solicitation.request_type !== 'apostilas' && (
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  ⏳ Aguardando orçamentos — O administrador está coletando os orçamentos.
                </p>
              )}
              {solicitation.approval_status === 'pending_approval' && (
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  📋 Em análise de aprovação — Seu pedido está sendo avaliado pelos aprovadores.
                </p>
              )}
              {solicitation.approval_status === 'approved_partial' && (
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  ✅ Aprovado parcialmente — Aguardando aprovação adicional.
                </p>
              )}
              {solicitation.approval_status === 'approved_released' && solicitation.request_type === 'apostilas' && (
                <p className="text-sm text-green-700 dark:text-green-400">
                  🎉 Solicitação confirmada — Suas apostilas estão sendo produzidas pela gráfica!
                </p>
              )}
              {solicitation.approval_status === 'approved_released' && solicitation.request_type !== 'apostilas' && (
                <p className="text-sm text-green-700 dark:text-green-400">
                  🎉 Liberado para compra — Seu pedido foi aprovado e está em processo de compra!
                </p>
              )}
              {solicitation.approval_status === 'rejected' && (
                <p className="text-sm text-red-700 dark:text-red-400">
                  ❌ Pedido rejeitado — {solicitation.admin_justification || 'Sem justificativa informada.'}
                </p>
              )}
            </div>
          )}

          {/* Info sobre aprovação para admin */}
          {adminMode && solicitation.approval_status === 'approved_released' && (
            <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-sm text-green-700 dark:text-green-400 font-medium">
                ✅ Liberado para compra — Gerencie a entrega na aba "Gestão de Entregas".
              </p>
            </div>
          )}

          {/* Ações administrativas — rejeitar e excluir */}
          {adminMode && (
            <div className="flex flex-wrap gap-2 justify-start pt-2">
              {/* Botão Rejeitar — só aparece se solicitação não foi finalizada */}
              {solicitation.approval_status !== 'rejected' &&
                solicitation.approval_status !== 'delivered' &&
                solicitation.status !== 'rejected' &&
                solicitation.status !== 'delivered' && (
                  <Button
                    variant="destructive"
                    disabled={loading || rejecting}
                    onClick={() => setRejectDialogOpen(true)}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Rejeitar Solicitação
                  </Button>
                )}

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={loading}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir Solicitação
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja excluir esta solicitação? Esta ação não pode ser desfeita.
                      Todos os orçamentos e anexos relacionados também serão excluídos.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteSolicitation} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}

          {/* Dialog de rejeição — admin */}
          <Dialog open={rejectDialogOpen} onOpenChange={(o) => { if (!rejecting) setRejectDialogOpen(o); }}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-destructive">
                  <XCircle className="h-5 w-5" />
                  Rejeitar Solicitação
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Informe o motivo da rejeição. O solicitante será notificado por e-mail
                  com essa justificativa.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="reject-reason">Motivo da rejeição *</Label>
                  <Textarea
                    id="reject-reason"
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Explique por que esta solicitação está sendo rejeitada..."
                    rows={5}
                    disabled={rejecting}
                  />
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button
                  variant="outline"
                  onClick={() => setRejectDialogOpen(false)}
                  disabled={rejecting}
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleAdminReject}
                  disabled={rejecting || !rejectReason.trim()}
                >
                  {rejecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Confirmar Rejeição
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>


          {!adminMode && !isEditing && (() => {
            const createdMs = solicitation?.created_at ? new Date(solicitation.created_at).getTime() : 0;
            const elapsedMs = Date.now() - createdMs;
            const twoHoursMs = 2 * 60 * 60 * 1000;
            const canEdit = createdMs > 0 && elapsedMs <= twoHoursMs;
            const minutesLeft = Math.max(0, Math.ceil((twoHoursMs - elapsedMs) / 60000));
            return (
              <div className="flex justify-between items-center gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  {canEdit ? (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" disabled={loading}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar Solicitação
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                            Atenção ao Editar
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            Ao editar sua solicitação, ela voltará para o <strong>final da fila</strong> e precisará passar novamente pelo processo de orçamentos e aprovação.
                            A edição só é permitida em até <strong>2 horas</strong> após a criação (horário de Brasília). Tempo restante: <strong>{minutesLeft} min</strong>.
                            Deseja continuar?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={startEditing}>
                            Sim, quero editar
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  ) : (
                    <Button variant="outline" disabled title="A edição só é permitida em até 2h após a criação da solicitação">
                      <Edit className="mr-2 h-4 w-4" />
                      Edição indisponível (2h expiradas)
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {solicitation && solicitation.status === 'pending' &&
                    (solicitation.approval_status === 'pending_approval' || solicitation.approval_status === 'approved_partial') &&
                    (() => {
                      const lastSent = getReminderSentAt(solicitationId);
                      const onCooldown = lastSent !== null && Date.now() - lastSent < REMINDER_COOLDOWN_MS;
                      const hoursLeft = onCooldown ? Math.ceil((REMINDER_COOLDOWN_MS - (Date.now() - (lastSent || 0))) / 3600000) : 0;
                      return (
                        <Button
                          variant="outline"
                          onClick={handleSendReminder}
                          disabled={sendingReminder || onCooldown || loading}
                          title={onCooldown ? `Lembrete já enviado. Disponível novamente em ~${hoursLeft}h` : "Enviar lembrete por e-mail aos aprovadores"}
                          className="border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/40"
                        >
                          {sendingReminder ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <BellRing className="mr-2 h-4 w-4" />
                          )}
                          {onCooldown ? `Lembrete enviado (${hoursLeft}h)` : "Lembrar Aprovadores"}
                        </Button>
                      );
                    })()}

                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Fechar
                  </Button>
                </div>
              </div>
            );
          })()}

          {!adminMode && isEditing && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-200 dark:border-amber-800 rounded-lg space-y-4">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-5 w-5" />
                <h3 className="font-semibold">Modo de Edição</h3>
              </div>
              <p className="text-sm text-amber-600 dark:text-amber-500">
                Após salvar, sua solicitação voltará para o final da fila de aprovação.
              </p>

              {solicitation.request_type === "product" && (
                <div className="space-y-3">
                  {editItems.map((item, idx) => (
                    <div key={idx} className="p-3 border rounded-lg space-y-3 bg-background">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">Produto {idx + 1}</span>
                        {editItems.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditItems(editItems.filter((_, i) => i !== idx))}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Nome do Produto</Label>
                          <Input
                            value={item.name}
                            onChange={(e) => {
                              const next = [...editItems];
                              next[idx] = { ...next[idx], name: e.target.value };
                              setEditItems(next);
                            }}
                          />
                        </div>
                        <div>
                          <Label>Quantidade</Label>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => {
                              const next = [...editItems];
                              next[idx] = { ...next[idx], quantity: parseInt(e.target.value) || 1 };
                              setEditItems(next);
                            }}
                          />
                        </div>
                      </div>
                      <div>
                        <Label>Link do Produto</Label>
                        <Input
                          value={item.link || ""}
                          onChange={(e) => {
                            const next = [...editItems];
                            next[idx] = { ...next[idx], link: e.target.value };
                            setEditItems(next);
                          }}
                        />
                      </div>
                      <div>
                        <Label>Observações</Label>
                        <Textarea
                          value={item.observations || ""}
                          onChange={(e) => {
                            const next = [...editItems];
                            next[idx] = { ...next[idx], observations: e.target.value };
                            setEditItems(next);
                          }}
                        />
                      </div>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setEditItems([...editItems, { name: "", quantity: 1, link: "", observations: "" }])}
                  >
                    + Adicionar Produto
                  </Button>
                </div>
              )}

              <div>
                <Label htmlFor="edit-general-description">Descrição Geral</Label>
                <Textarea
                  id="edit-general-description"
                  value={editData.general_description}
                  onChange={(e) => setEditData({ ...editData, general_description: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-amber-200 dark:border-amber-800">
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  disabled={loading}
                >
                  Cancelar Edição
                </Button>
                <Button onClick={handleUserUpdate} disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar e Voltar para Fila
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
