import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, LogOut, FileDown, Package, Calendar, ShoppingBag, Upload, FileText, CheckCircle, ExternalLink, Zap, MessageCircleQuestion, Crown, MessageSquare } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { StatusBadge, ApprovalStatusBadge } from "@/components/StatusBadge";
import { RequestDetailsDialog } from "@/components/RequestDetailsDialog";
import { ReportDialog } from "@/components/ReportDialog";
import { PurchasesCRM } from "@/components/PurchasesCRM";
import { AdminRejectionsHistory } from "@/components/AdminRejectionsHistory";
import { KeyApproverRejectionsAlert } from "@/components/KeyApproverRejectionsAlert";
import { ApproverQuestionsAlert } from "@/components/ApproverQuestionsAlert";
import { DirectPurchaseDialog } from "@/components/DirectPurchaseDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatDateOnly, todayLocalISO } from "@/lib/utils";

interface Solicitation {
  id: string;
  created_at: string;
  user_id: string;
  requester_name: string;
  requester_phone: string;
  requester_email: string | null;
  request_type: string;
  product_name: string | null;
  flight_origin: string | null;
  flight_destination: string | null;
  material_type: string | null;
  status: "pending" | "approved" | "rejected" | "purchasing" | "delivered";
  approval_status: string | null;
  estimated_arrival_date: string | null;
  actual_delivery_date: string | null;
  delivery_observations: string | null;
  general_description: string | null;
  released_at: string | null;
  updated_at: string;
  invoice_number: string | null;
  invoice_file_path: string | null;
  invoice_file_name: string | null;
  invoice_uploaded_at: string | null;
  user_messages_count: number;
  product_deliveries?: Record<string, ProductDelivery> | null;
}

interface ProductDelivery {
  status?: string;
  estimated_arrival_date?: string | null;
  actual_delivery_date?: string | null;
  invoice_number?: string | null;
  invoice_file_path?: string | null;
  invoice_file_name?: string | null;
  observations?: string | null;
}

const requestTypeLabels: Record<string, string> = {
  product: "Produto",
  flight: "Passagem",
  personalized_material: "Material",
  accommodation: "Hospedagem",
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

const Admin = () => {
  const navigate = useNavigate();
  const [solicitations, setSolicitations] = useState<Solicitation[]>([]);
  const [filteredSolicitations, setFilteredSolicitations] = useState<Solicitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [selectedSolicitationId, setSelectedSolicitationId] = useState<string | null>(null);
  const [userName, setUserName] = useState("");
  const [isPlainAdmin, setIsPlainAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [directPurchaseOpen, setDirectPurchaseOpen] = useState(false);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  // Filtros da aba Entregas
  const [delSearch, setDelSearch] = useState("");
  const [delStatusFilter, setDelStatusFilter] = useState<string>("all");
  const [delTypeFilter, setDelTypeFilter] = useState<string>("all");

  // Delivery management state
  const [deliveryDialogOpen, setDeliveryDialogOpen] = useState(false);
  const [selectedDeliverySolicitation, setSelectedDeliverySolicitation] = useState<Solicitation | null>(null);
  const [estimatedDate, setEstimatedDate] = useState("");
  const [actualDeliveryDate, setActualDeliveryDate] = useState("");
  const [observations, setObservations] = useState("");
  const [deliveryStatus, setDeliveryStatus] = useState<string>("approved_released");
  const [saving, setSaving] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [uploadingInvoice, setUploadingInvoice] = useState(false);
  const [approvedQuotes, setApprovedQuotes] = useState<Array<{ id: string; product_name: string | null; supplier_name: string | null; store_name?: string | null; value: number | null; file_path: string; file_name: string }>>([]);
  const [productDeliveries, setProductDeliveries] = useState<Record<string, ProductDelivery>>({});
  const [productDeliveryFiles, setProductDeliveryFiles] = useState<Record<string, File | null>>({});

  useEffect(() => {
    checkAdminAndLoadData();

    const realtime = supabase
      .channel("admin-messages")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "solicitation_messages" },
        () => {
          loadSolicitations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(realtime);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    applyFilters();
  }, [solicitations, searchTerm, statusFilter, typeFilter]);

  const checkAdminAndLoadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      // Check if user is admin
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id);

      const isAdmin = roles?.some(r => r.role === 'admin');
      const hasSuperAdmin = roles?.some(r => r.role === 'super_admin');

      if (!isAdmin && !hasSuperAdmin) {
        toast.error("Acesso negado. Apenas administradores podem acessar esta área.");
        navigate("/");
        return;
      }

      setIsSuperAdmin(hasSuperAdmin || false);
      setIsPlainAdmin(isAdmin || false);

      // Load user profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', session.user.id)
        .single();

      setUserName(profile?.full_name || session.user.email || "Admin");

      loadSolicitations();
    } catch (error) {
      console.error("Erro ao verificar permissões:", error);
      navigate("/auth");
    }
  };

  const loadSolicitations = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('solicitations')
        .select('*')
        .neq('request_type', 'internal_requisition')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const withMessageCounts = await Promise.all(
        ((data as any[]) || []).map(async (sol) => {
          const { count: userMessagesCount } = await supabase
            .from('solicitation_messages' as any)
            .select('*', { count: 'exact', head: true })
            .eq('solicitation_id', sol.id)
            .eq('channel', 'user')
            .eq('sender_id', sol.user_id);
          return {
            ...sol,
            user_messages_count: userMessagesCount || 0,
          } as Solicitation;
        })
      );

      setSolicitations(withMessageCounts);
    } catch (error) {
      console.error('Erro ao carregar solicitações:', error);
      toast.error("Erro ao carregar solicitações");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    // Filtrar apenas solicitações em andamento (excluir compradas, entregues, liberadas e rejeitadas)
    let filtered = solicitations.filter(s =>
      s.status !== 'purchasing' &&
      s.status !== 'delivered' &&
      s.status !== 'rejected' &&
      s.approval_status !== 'purchasing' &&
      s.approval_status !== 'delivered' &&
      s.approval_status !== 'approved_released' &&
      s.approval_status !== 'rejected'
    );

    if (searchTerm) {
      filtered = filtered.filter((s) =>
        s.requester_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.product_name && s.product_name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((s) => s.status === statusFilter);
    }

    if (typeFilter !== "all") {
      filtered = filtered.filter((s) => s.request_type === typeFilter);
    }

    // Urgentes sempre no topo
    filtered.sort((a: any, b: any) => Number(!!b.is_urgent) - Number(!!a.is_urgent));

    setFilteredSolicitations(filtered);
  };

  const getItemTitle = (solicitation: Solicitation) => {
    if (solicitation.request_type === "product") {
      return solicitation.product_name || "Produto";
    } else if (solicitation.request_type === "flight") {
      return `${solicitation.flight_origin} → ${solicitation.flight_destination}`;
    } else if (solicitation.request_type === "personalized_material") {
      return solicitation.material_type ? materialTypeLabels[solicitation.material_type] : "Material";
    } else if (solicitation.request_type === "accommodation") {
      return "Reserva de Hospedagem";
    }
    return "—";
  };

  const openDetails = (id: string) => {
    setSelectedSolicitationId(id);
    setDetailsOpen(true);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  // Delivery management functions
  const releasedSolicitations = solicitations.filter(
    s => s.approval_status === 'approved_released' || s.approval_status === 'delivered'
  );

  const deliveryStatusOf = (s: Solicitation) =>
    s.approval_status === 'delivered' ? 'delivered'
      : (s.approval_status === 'purchasing' || s.status === 'purchasing') ? 'purchasing'
      : 'approved_released';

  const filteredReleased = releasedSolicitations.filter((s) => {
    const term = delSearch.trim().toLowerCase();
    if (term) {
      const hay = [
        s.requester_name,
        s.product_name,
        s.flight_origin,
        s.flight_destination,
        s.material_type,
        s.invoice_number,
        s.general_description,
      ].filter(Boolean).join(" ").toLowerCase();
      if (!hay.includes(term)) return false;
    }
    if (delStatusFilter !== "all" && deliveryStatusOf(s) !== delStatusFilter) return false;
    if (delTypeFilter !== "all" && s.request_type !== delTypeFilter) return false;
    return true;
  });

  const openDeliveryDetail = async (solicitation: Solicitation) => {
    setSelectedDeliverySolicitation(solicitation);
    setEstimatedDate(solicitation.estimated_arrival_date || "");
    setActualDeliveryDate(solicitation.actual_delivery_date || "");
    setObservations(solicitation.delivery_observations || "");
    setDeliveryStatus(solicitation.approval_status || "approved_released");
    setInvoiceNumber(solicitation.invoice_number || "");
    setInvoiceFile(null);
    setApprovedQuotes([]);
    setProductDeliveries((solicitation.product_deliveries as any) || {});
    setProductDeliveryFiles({});
    setDeliveryDialogOpen(true);

    // Load approved quotes — one per product (most voted), supporting multi-product requests
    try {
      const { data: approvals } = await supabase
        .from('approvals')
        .select('selected_quote_id, selected_quote_ids')
        .eq('solicitation_id', solicitation.id)
        .eq('status', 'approved');

      const allQuoteIds = new Set<string>();
      const voteCounts: Record<string, number> = {};
      (approvals || []).forEach((a: any) => {
        const ids: string[] = [];
        if (Array.isArray(a.selected_quote_ids) && a.selected_quote_ids.length > 0) {
          ids.push(...a.selected_quote_ids);
        } else if (a.selected_quote_id) {
          ids.push(a.selected_quote_id);
        }
        ids.forEach((id) => {
          if (!id) return;
          allQuoteIds.add(id);
          voteCounts[id] = (voteCounts[id] || 0) + 1;
        });
      });

      if (allQuoteIds.size > 0) {
        const { data: quotes } = await supabase
          .from('quotes')
          .select('id, product_name, supplier_name, store_name, value, file_path, file_name')
          .in('id', Array.from(allQuoteIds));

        if (quotes && quotes.length > 0) {
          // Group by product_name and pick the most voted quote per product
          const byProduct = new Map<string, any>();
          quotes.forEach((q: any) => {
            const key = q.product_name || '__default__';
            const current = byProduct.get(key);
            const qVotes = voteCounts[q.id] || 0;
            const currentVotes = current ? (voteCounts[current.id] || 0) : -1;
            if (!current || qVotes > currentVotes) {
              byProduct.set(key, q);
            }
          });
          setApprovedQuotes(Array.from(byProduct.values()) as any);
        }
      }
    } catch (err) {
      console.error("Erro ao carregar orçamento aprovado:", err);
    }
  };

  const handleSaveDelivery = async () => {
    if (!selectedDeliverySolicitation) return;

    setSaving(true);
    try {
      const isAccommodation = selectedDeliverySolicitation.request_type === 'accommodation';
      const isMultiProduct = approvedQuotes.length > 1;

      // === Multi-product path: save per-product info into product_deliveries JSON ===
      if (isMultiProduct) {
        setUploadingInvoice(true);
        const updatedDeliveries: Record<string, ProductDelivery> = { ...productDeliveries };

        for (const q of approvedQuotes) {
          const current = updatedDeliveries[q.id] || {};
          const file = productDeliveryFiles[q.id];
          if (file) {
            const fileExt = file.name.split('.').pop();
            const filePath = `${selectedDeliverySolicitation.id}/invoice_${q.id}_${Date.now()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage
              .from('solicitation-attachments')
              .upload(filePath, file);
            if (uploadError) {
              console.error("Erro ao fazer upload:", uploadError);
              toast.error(`Erro ao anexar NF do produto ${q.product_name || ''}`);
              setUploadingInvoice(false);
              setSaving(false);
              return;
            }
            current.invoice_file_path = filePath;
            current.invoice_file_name = file.name;
          }
          updatedDeliveries[q.id] = current;
        }
        setUploadingInvoice(false);

        // Overall status derived from all product statuses
        const statuses = approvedQuotes.map((q) => updatedDeliveries[q.id]?.status || 'approved_released');
        const allDelivered = statuses.every((s) => s === 'delivered');
        const anyPurchasingOrDelivered = statuses.some((s) => s === 'purchasing' || s === 'delivered');
        const newStatus = allDelivered ? 'delivered' : anyPurchasingOrDelivered ? 'purchasing' : 'approved';
        const newApprovalStatus = allDelivered ? 'delivered' : 'approved_released';

        const { error: updateError } = await supabase
          .from('solicitations')
          .update({
            product_deliveries: updatedDeliveries as any,
            approval_status: newApprovalStatus,
            status: newStatus,
            actual_delivery_date: allDelivered ? todayLocalISO() : null,
          })
          .eq('id', selectedDeliverySolicitation.id);

        if (updateError) throw updateError;

        toast.success("Informações por produto salvas com sucesso!");
        loadSolicitations();
        setDeliveryDialogOpen(false);
        return;
      }

      // === Single-product path (existing behavior) ===
      let newStatus: string;
      let newApprovalStatus: string;

      if (deliveryStatus === 'delivered' || (isAccommodation && deliveryStatus === 'purchasing')) {
        newStatus = 'delivered';
        newApprovalStatus = 'delivered';
      } else if (deliveryStatus === 'purchasing') {
        newStatus = 'purchasing';
        newApprovalStatus = 'approved_released';
      } else {
        newStatus = 'approved';
        newApprovalStatus = 'approved_released';
      }

      let invoiceFilePath = selectedDeliverySolicitation.invoice_file_path;
      let invoiceFileName = selectedDeliverySolicitation.invoice_file_name;

      if (invoiceFile) {
        setUploadingInvoice(true);
        const fileExt = invoiceFile.name.split('.').pop();
        const filePath = `${selectedDeliverySolicitation.id}/invoice_${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('solicitation-attachments')
          .upload(filePath, invoiceFile);

        if (uploadError) {
          console.error("Erro ao fazer upload:", uploadError);
          toast.error("Erro ao fazer upload da nota fiscal");
          setUploadingInvoice(false);
          setSaving(false);
          return;
        }

        invoiceFilePath = filePath;
        invoiceFileName = invoiceFile.name;
        setUploadingInvoice(false);
      }

      const { error: updateError } = await supabase
        .from('solicitations')
        .update({
          estimated_arrival_date: estimatedDate || null,
          actual_delivery_date: deliveryStatus === 'delivered' ? (actualDeliveryDate || todayLocalISO()) : null,
          delivery_observations: observations || null,
          approval_status: newApprovalStatus,
          status: newStatus,
          invoice_number: invoiceNumber || null,
          invoice_file_path: invoiceFilePath,
          invoice_file_name: invoiceFileName,
          invoice_uploaded_at: invoiceFile ? new Date().toISOString() : selectedDeliverySolicitation.invoice_uploaded_at,
        })
        .eq('id', selectedDeliverySolicitation.id);

      if (updateError) throw updateError;

      const statusMessages: Record<string, string> = {
        purchasing: isAccommodation ? "Reserva confirmada! O usuário será notificado." : "Compra realizada! O pedido foi movido para o CRM.",
        delivered: "Pedido marcado como entregue!",
        approved_released: "Status atualizado com sucesso!",
      };

      toast.success(statusMessages[deliveryStatus] || "Informações salvas com sucesso!");
      loadSolicitations();
      setDeliveryDialogOpen(false);
    } catch (error) {
      console.error("Erro ao salvar:", error);
      toast.error("Erro ao salvar informações");
    } finally {
      setSaving(false);
    }
  };

  const updateProductDelivery = (quoteId: string, patch: Partial<ProductDelivery>) => {
    setProductDeliveries((prev) => ({
      ...prev,
      [quoteId]: { ...(prev[quoteId] || {}), ...patch },
    }));
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Painel Administrativo</h1>
            <p className="text-muted-foreground text-lg">
              Gestão completa de solicitações de compras
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-muted-foreground">
              Olá, <span className="font-medium">{userName}</span>
            </span>
            <Button variant="outline" onClick={() => setReportOpen(true)}>
              <FileDown className="mr-2 h-4 w-4" />
              Exportar
            </Button>
            <Button variant="outline" onClick={() => navigate("/approvals")}>
              <MessageCircleQuestion className="mr-2 h-4 w-4" />
              Análise e Perguntas
            </Button>
            {isPlainAdmin && (
              <Button variant="outline" onClick={() => navigate("/admin/integracoes/identidades")}>
                Identidades Externas
              </Button>
            )}
            {isSuperAdmin && (
              <Button variant="outline" onClick={() => navigate("/admin/users")}>
                <Crown className="mr-2 h-4 w-4" />
                Usuários
              </Button>
            )}
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>

        {/* Key approver rejections alert (Super Admin only) */}
        {isSuperAdmin && (
          <KeyApproverRejectionsAlert
            onOpenDetails={(id) => {
              setSelectedSolicitationId(id);
              setDetailsOpen(true);
            }}
          />
        )}

        {/* Perguntas pendentes de aprovadores */}
        <ApproverQuestionsAlert
          onOpenDetails={(id) => {
            setSelectedSolicitationId(id);
            setDetailsOpen(true);
          }}
        />


        {/* Tabs */}
        <Tabs defaultValue="solicitations" className="space-y-6">
          <TabsList>
            <TabsTrigger value="solicitations">Solicitações</TabsTrigger>
            {isSuperAdmin && (
              <>
                <TabsTrigger value="deliveries">Gestão de Entregas</TabsTrigger>
                <TabsTrigger value="purchases">
                  <ShoppingBag className="h-4 w-4 mr-2" />
                  Compras Realizadas
                </TabsTrigger>
                <TabsTrigger value="rejections">
                  Histórico de Rejeições
                </TabsTrigger>
              </>
            )}
          </TabsList>

          {/* Solicitations Tab */}
          <TabsContent value="solicitations" className="space-y-6">
            {/* Filters */}
            <div className="flex flex-col lg:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, ID ou item..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="lg:w-[180px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="approved">Aprovado</SelectItem>
                  <SelectItem value="rejected">Reprovado</SelectItem>
                  <SelectItem value="purchasing">Em Compra</SelectItem>
                  <SelectItem value="delivered">Entregue</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="lg:w-[180px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  <SelectItem value="product">Produto</SelectItem>
                  <SelectItem value="flight">Passagem</SelectItem>
                  <SelectItem value="personalized_material">Material</SelectItem>
                  <SelectItem value="accommodation">Hospedagem</SelectItem>
                  <SelectItem value="apostilas">Apostilas</SelectItem>
                    <SelectItem value="cleaning_product">Produto de Limpeza</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            <div className="bg-card rounded-lg border shadow-sm">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">ID</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Solicitante</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Mensagens</TableHead>
                    <TableHead>Previsão</TableHead>
                    <TableHead>Atualizado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : filteredSolicitations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                        Nenhuma solicitação encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSolicitations.map((solicitation) => (
                      <TableRow
                        key={solicitation.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => openDetails(solicitation.id)}
                      >
                        <TableCell className="font-mono text-xs">
                          {solicitation.id.slice(0, 8)}
                        </TableCell>
                        <TableCell>
                          {format(new Date(solicitation.created_at), "dd/MM/yy", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="font-medium">
                          {solicitation.requester_name}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {requestTypeLabels[solicitation.request_type]}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          <div className="flex items-center gap-2">
                            {(solicitation as any).is_urgent && (
                              <TooltipProvider delayDuration={100}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge variant="destructive" className="shrink-0 text-[10px] px-1.5 py-0.5 cursor-help">
                                      🚨 URGENTE
                                    </Badge>
                                  </TooltipTrigger>
                                  {(solicitation as any).urgency_justification && (
                                    <TooltipContent side="top" className="max-w-xs whitespace-pre-wrap">
                                      <span className="font-semibold">Justificativa da urgência:</span>{" "}
                                      {(solicitation as any).urgency_justification}
                                    </TooltipContent>
                                  )}
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            <span className="truncate">{getItemTitle(solicitation)}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <ApprovalStatusBadge status={solicitation.approval_status} />
                        </TableCell>
                        <TableCell>
                          {solicitation.user_messages_count > 0 ? (
                            <Badge className="bg-red-500 text-white hover:bg-red-600 whitespace-nowrap">
                              <MessageSquare className="h-3 w-3 mr-1" />
                              {solicitation.user_messages_count} mensagem(s)
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {solicitation.estimated_arrival_date ? (
                            <span className="text-sm">
                              {formatDateOnly(solicitation.estimated_arrival_date, "dd/MM/yy")}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(solicitation.updated_at), "dd/MM HH:mm", { locale: ptBR })}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          {/* Deliveries Tab (Super Admin only) */}
          {isSuperAdmin && (
            <TabsContent value="deliveries" className="space-y-6">
              {/* Direct Purchase Button */}
              <div className="flex justify-end">
                <Button
                  variant="destructive"
                  onClick={() => setDirectPurchaseOpen(true)}
                >
                  <Zap className="mr-2 h-4 w-4" />
                  Lançar Compra Direta (Emergência)
                </Button>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Aguardando Compra</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {releasedSolicitations.filter(s => s.approval_status === 'approved_released').length}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Entregues</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {releasedSolicitations.filter(s => s.approval_status === 'delivered').length}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Total Liberados</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{releasedSolicitations.length}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por solicitante, item, nota fiscal..."
                    value={delSearch}
                    onChange={(e) => setDelSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={delStatusFilter} onValueChange={setDelStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="approved_released">Aguardando Compra</SelectItem>
                    <SelectItem value="purchasing">Compra Realizada</SelectItem>
                    <SelectItem value="delivered">Entregue</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={delTypeFilter} onValueChange={setDelTypeFilter}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    <SelectItem value="product">Produto</SelectItem>
                    <SelectItem value="flight">Passagem</SelectItem>
                    <SelectItem value="personalized_material">Material</SelectItem>
                    <SelectItem value="accommodation">Hospedagem</SelectItem>
                    <SelectItem value="apostilas">Apostilas</SelectItem>
                    <SelectItem value="cleaning_product">Produto de Limpeza</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Delivery Table */}
              <div className="bg-card rounded-lg border shadow-sm">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">ID</TableHead>
                      <TableHead>Liberado em</TableHead>
                      <TableHead>Solicitante</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Previsão</TableHead>
                      <TableHead>Data Entrega</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                         <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                          Carregando...
                        </TableCell>
                      </TableRow>
                    ) : filteredReleased.length === 0 ? (
                      <TableRow>
                         <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                          Nenhum pedido encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredReleased.map((solicitation) => (
                        <TableRow key={solicitation.id}>
                          <TableCell className="font-mono text-xs">
                            {solicitation.id.slice(0, 8)}
                          </TableCell>
                          <TableCell>
                            {solicitation.released_at 
                              ? format(new Date(solicitation.released_at), "dd/MM/yy HH:mm", { locale: ptBR })
                              : "—"
                            }
                          </TableCell>
                          <TableCell className="font-medium">
                            {solicitation.requester_name}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">
                              {requestTypeLabels[solicitation.request_type]}
                            </span>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {getItemTitle(solicitation)}
                          </TableCell>
                          <TableCell>
                            {solicitation.estimated_arrival_date 
                              ? formatDateOnly(solicitation.estimated_arrival_date, "dd/MM/yy")
                              : <span className="text-muted-foreground">—</span>
                            }
                          </TableCell>
                          <TableCell>
                            {solicitation.actual_delivery_date 
                              ? formatDateOnly(solicitation.actual_delivery_date, "dd/MM/yy")
                              : <span className="text-muted-foreground">—</span>
                            }
                          </TableCell>
                          <TableCell>
                            <Badge variant={solicitation.approval_status === 'delivered' ? "default" : "secondary"}
                              className={
                                solicitation.approval_status === 'delivered' ? "bg-green-500" : 
                                solicitation.approval_status === 'purchasing' || solicitation.status === 'purchasing' ? "bg-purple-500" : 
                                "bg-blue-500"
                              }>
                              {solicitation.approval_status === 'delivered' ? "Entregue" : 
                               solicitation.approval_status === 'purchasing' || solicitation.status === 'purchasing' ? "Compra Realizada" : 
                               "Aguardando Compra"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openDeliveryDetail(solicitation)}
                            >
                              <Package className="mr-2 h-4 w-4" />
                              Gerenciar
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          )}

          {/* Purchases CRM Tab (Super Admin only) */}
          {isSuperAdmin && (
            <TabsContent value="purchases" className="space-y-6">
              <div className="mb-4">
                <h2 className="text-2xl font-semibold">CRM de Compras</h2>
                <p className="text-muted-foreground">
                  Organize e acompanhe o status de todas as suas compras
                </p>
              </div>
              <PurchasesCRM 
                solicitations={solicitations.filter(s => 
                  s.approval_status === 'approved_released' || 
                  s.status === 'purchasing' || 
                  s.status === 'delivered' ||
                  s.approval_status === 'delivered' ||
                  s.approval_status === 'rejected'
                )} 
                onUpdate={loadSolicitations} 
              />
            </TabsContent>
          )}

          {/* Rejections History Tab (Super Admin only) */}
          {isSuperAdmin && (
            <TabsContent value="rejections" className="space-y-6">
              <div className="mb-4">
                <h2 className="text-2xl font-semibold">Histórico de Rejeições</h2>
                <p className="text-muted-foreground">
                  Solicitações rejeitadas por administradores
                </p>
              </div>
              <AdminRejectionsHistory
                onOpenDetails={(id) => {
                  setSelectedSolicitationId(id);
                  setDetailsOpen(true);
                }}
              />
            </TabsContent>
          )}
        </Tabs>

        {/* Details Dialog */}
        <RequestDetailsDialog
          solicitationId={selectedSolicitationId}
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
          onSuccess={loadSolicitations}
          adminMode={true}
        />

        {/* Report Dialog */}
        <ReportDialog
          open={reportOpen}
          onOpenChange={setReportOpen}
        />

        {/* Direct Purchase Dialog */}
        <DirectPurchaseDialog
          open={directPurchaseOpen}
          onOpenChange={setDirectPurchaseOpen}
          onSuccess={loadSolicitations}
        />


        {/* Delivery Management Dialog */}
        <Dialog open={deliveryDialogOpen} onOpenChange={setDeliveryDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Gerenciar Entrega
              </DialogTitle>
            </DialogHeader>

            {selectedDeliverySolicitation && (
              <div className="space-y-6">
                {/* Solicitation Info */}
                <Card>
                  <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-sm">Informações do Pedido</CardTitle>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedSolicitationId(selectedDeliverySolicitation.id);
                        setDetailsOpen(true);
                      }}
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      Ver detalhes completos
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-muted-foreground">Solicitante:</span>{" "}
                        <span className="font-medium">{selectedDeliverySolicitation.requester_name}</span>
                      </div>
                      {selectedDeliverySolicitation.requester_phone && (
                        <div>
                          <span className="text-muted-foreground">Telefone:</span>{" "}
                          <span>{selectedDeliverySolicitation.requester_phone}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-muted-foreground">Tipo:</span>{" "}
                        <span>{requestTypeLabels[selectedDeliverySolicitation.request_type]}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Criado em:</span>{" "}
                        <span>{format(new Date(selectedDeliverySolicitation.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Item:</span>{" "}
                      <span className="font-medium">{getItemTitle(selectedDeliverySolicitation)}</span>
                    </div>
                    {selectedDeliverySolicitation.general_description && (
                      <div>
                        <span className="text-muted-foreground">Descrição do solicitante:</span>
                        <p className="mt-1 p-2 bg-muted rounded whitespace-pre-wrap">{selectedDeliverySolicitation.general_description}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Approved Quotes Info */}
                {approvedQuotes.length > 0 && (
                  <div className="space-y-2">
                    {approvedQuotes.map((q) => (
                      <Card key={q.id} className="border-green-200 bg-green-50">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center gap-2 text-green-700">
                            <CheckCircle className="h-4 w-4" />
                            Orçamento Aprovado{q.product_name ? ` — ${q.product_name}` : ''}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                          {q.store_name && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Loja:</span>
                              <span className="font-semibold">🏪 {q.store_name}</span>
                            </div>
                          )}
                          {q.supplier_name && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Observação:</span>
                              <span className="font-medium">{q.supplier_name}</span>
                            </div>
                          )}
                          {q.value && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Valor:</span>
                              <span className="font-bold text-green-600">
                                R$ {q.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          )}
                          {q.file_path?.startsWith('http') && (
                            <div className="flex justify-between items-center">
                              <span className="text-muted-foreground">Link:</span>
                              <a href={q.file_path} target="_blank" rel="noopener noreferrer"
                                className="text-primary hover:underline flex items-center gap-1 text-xs">
                                Ver link <ExternalLink className="h-3 w-3" />
                              </a>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {/* Form */}
                {approvedQuotes.length > 1 ? (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Esta solicitação tem <strong>{approvedQuotes.length} produtos</strong>. Preencha as informações de entrega separadamente para cada um.
                    </p>
                    {approvedQuotes.map((q) => {
                      const pd = productDeliveries[q.id] || {};
                      const pdStatus = pd.status || 'approved_released';
                      return (
                        <Card key={q.id} className="border-primary/30">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <Package className="h-4 w-4 text-primary" />
                              {q.product_name || 'Produto'}
                              {q.store_name && <span className="text-xs text-muted-foreground font-normal">🏪 {q.store_name}</span>}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="space-y-2">
                              <Label>Status</Label>
                              <Select
                                value={pdStatus}
                                onValueChange={(v) => updateProductDelivery(q.id, { status: v })}
                              >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="approved_released">Aguardando Compra</SelectItem>
                                  <SelectItem value="purchasing">Compra Realizada</SelectItem>
                                  <SelectItem value="delivered">Entregue</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-2">
                                <Label className="flex items-center gap-2"><Calendar className="h-4 w-4" />Previsão</Label>
                                <Input
                                  type="date"
                                  value={pd.estimated_arrival_date || ''}
                                  onChange={(e) => updateProductDelivery(q.id, { estimated_arrival_date: e.target.value || null })}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="flex items-center gap-2"><Calendar className="h-4 w-4" />Data de Entrega</Label>
                                <Input
                                  type="date"
                                  value={pd.actual_delivery_date || ''}
                                  onChange={(e) => updateProductDelivery(q.id, { actual_delivery_date: e.target.value || null })}
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-2">
                                <Label className="flex items-center gap-2"><FileText className="h-4 w-4" />Número da NF</Label>
                                <Input
                                  type="text"
                                  value={pd.invoice_number || ''}
                                  onChange={(e) => updateProductDelivery(q.id, { invoice_number: e.target.value || null })}
                                  placeholder="Ex: NF-001234"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label className="flex items-center gap-2"><Upload className="h-4 w-4" />Anexar NF</Label>
                                <Input
                                  type="file"
                                  accept=".pdf,.png,.jpg,.jpeg"
                                  onChange={(e) => setProductDeliveryFiles((prev) => ({ ...prev, [q.id]: e.target.files?.[0] || null }))}
                                  className="cursor-pointer"
                                />
                                {pd.invoice_file_name && !productDeliveryFiles[q.id] && (
                                  <p className="text-xs text-muted-foreground">Arquivo: {pd.invoice_file_name}</p>
                                )}
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label>Observações</Label>
                              <Textarea
                                value={pd.observations || ''}
                                onChange={(e) => updateProductDelivery(q.id, { observations: e.target.value || null })}
                                rows={2}
                                placeholder="Observações deste produto..."
                              />
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="deliveryStatus">Status do Pedido</Label>
                    <Select value={deliveryStatus} onValueChange={setDeliveryStatus}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedDeliverySolicitation.request_type === 'accommodation' ? (
                          <>
                            <SelectItem value="approved_released">Aguardando Reserva</SelectItem>
                            <SelectItem value="purchasing">Reserva Confirmada</SelectItem>
                          </>
                        ) : (
                          <>
                            <SelectItem value="approved_released">Aguardando Compra</SelectItem>
                            <SelectItem value="purchasing">Compra Realizada</SelectItem>
                            <SelectItem value="delivered">Entregue</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Date fields - only for non-accommodation requests */}
                  {selectedDeliverySolicitation.request_type !== 'accommodation' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="estimatedDate" className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Previsão de Chegada
                        </Label>
                        <Input
                          id="estimatedDate"
                          type="date"
                          value={estimatedDate}
                          onChange={(e) => setEstimatedDate(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="actualDate" className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Data de Entrega
                        </Label>
                        <Input
                          id="actualDate"
                          type="date"
                          value={actualDeliveryDate}
                          onChange={(e) => setActualDeliveryDate(e.target.value)}
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="invoiceNumber" className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        {selectedDeliverySolicitation.request_type === 'accommodation' ? 'Número do Voucher' : 'Número da Nota Fiscal'}
                      </Label>
                      <Input
                        id="invoiceNumber"
                        type="text"
                        value={invoiceNumber}
                        onChange={(e) => setInvoiceNumber(e.target.value)}
                        placeholder={selectedDeliverySolicitation.request_type === 'accommodation' ? 'Ex: VCH-001234' : 'Ex: NF-001234'}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="invoiceFile" className="flex items-center gap-2">
                        <Upload className="h-4 w-4" />
                        {selectedDeliverySolicitation.request_type === 'accommodation' ? 'Anexar Comprovante' : 'Anexar Nota Fiscal'}
                      </Label>
                      <Input
                        id="invoiceFile"
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg"
                        onChange={(e) => setInvoiceFile(e.target.files?.[0] || null)}
                        className="cursor-pointer"
                      />
                      {selectedDeliverySolicitation?.invoice_file_name && !invoiceFile && (
                        <p className="text-xs text-muted-foreground">
                          Arquivo atual: {selectedDeliverySolicitation.invoice_file_name}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="observations">Observações</Label>
                    <Textarea
                      id="observations"
                      value={observations}
                      onChange={(e) => setObservations(e.target.value)}
                      placeholder={selectedDeliverySolicitation.request_type === 'accommodation' 
                        ? "Adicione observações sobre a reserva..." 
                        : "Adicione observações sobre a entrega..."}
                      rows={3}
                    />
                  </div>
                </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setDeliveryDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSaveDelivery} disabled={saving || uploadingInvoice}>
                    {saving || uploadingInvoice ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Admin;
