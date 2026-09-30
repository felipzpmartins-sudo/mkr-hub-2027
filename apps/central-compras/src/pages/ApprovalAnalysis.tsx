import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, LogOut, ArrowLeft, FileText, ShoppingBag, Ban, MessageCircleQuestion, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AnalysisDialog } from "@/components/AnalysisDialog";
import { PurchasesReport } from "@/components/PurchasesReport";
import { RejectionsHistory } from "@/components/RejectionsHistory";

const VETO_APPROVER_EMAILS = ["ceo@makergrupo.com.br", "controller@makergrupo.com.br"];

interface SolicitationWithQuotes {
  id: string;
  created_at: string;
  user_id: string;
  requester_name: string;
  request_type: string;
  product_name: string | null;
  flight_origin: string | null;
  flight_destination: string | null;
  material_type: string | null;
  approval_status: string;
  approved_count: number;
  general_description: string | null;
  quotes_count: number;
  approver_names: string[];
  questions_count: number;
  pending_questions_count: number;
  user_messages_count: number;
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

const approvalStatusLabels: Record<string, string> = {
  pending_quotes: "Aguardando Orçamentos",
  pending_approval: "Aguardando Aprovação",
  approved_partial: "Aprovado por 1 — não liberado",
  approved_released: "Liberado para Compra",
  rejected: "Rejeitado",
  delivered: "Entregue",
};

const ApprovalAnalysis = () => {
  const navigate = useNavigate();
  const [solicitations, setSolicitations] = useState<SolicitationWithQuotes[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending_approval");
  const [isApprover, setIsApprover] = useState(false);
  const [canVote, setCanVote] = useState(false);
  const [canAnswerQuestions, setCanAnswerQuestions] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState("");
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [selectedSolicitationId, setSelectedSolicitationId] = useState<string | null>(null);

  useEffect(() => {
    checkApproverAndLoad();

    const realtime = supabase
      .channel("approval-analysis-messages")
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

  const checkApproverAndLoad = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      setCurrentUserEmail(session.user.email || "");

      // Check if user is an approver or admin (Richard acompanha e responde perguntas)
      const { data: approver } = await supabase
        .from('approvers')
        .select('email')
        .eq('email', session.user.email)
        .maybeSingle();

      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id);

      const isAdmin = !!roles?.some((r: any) => ['admin', 'super_admin'].includes(r.role));

      if (!approver && !isAdmin) {
        toast.error("Acesso negado. Apenas aprovadores e administradores podem acessar esta área.");
        navigate("/");
        return;
      }

      setIsApprover(true);
      const userCanVote = !!approver;
      setCanVote(userCanVote);
      setCanAnswerQuestions(isAdmin);
      loadSolicitations(userCanVote);
    } catch (error) {
      console.error("Erro ao verificar permissões:", error);
      navigate("/");
    }
  };

  const loadSolicitations = async (includeDelivered = canVote) => {
    setLoading(true);
    try {
      // Get solicitations that have at least pending_approval status
      const { data: solicitationsData, error } = await supabase
        .from('solicitations')
        .select('*')
        .in('approval_status', includeDelivered
          ? ['pending_quotes', 'pending_approval', 'approved_partial', 'approved_released', 'rejected', 'delivered']
          : ['pending_quotes', 'pending_approval', 'approved_partial', 'approved_released', 'rejected']
        )
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get quotes count, messages count, and approver names for each solicitation
      const solicitationsWithQuotes = await Promise.all(
        (solicitationsData || []).map(async (sol) => {
          const { count } = await supabase
            .from('quotes')
            .select('*', { count: 'exact', head: true })
            .eq('solicitation_id', sol.id);

          // Buscar aprovações com status 'approved' e nomes dos aprovadores
          const { data: approvalsData } = await supabase
            .from('approvals')
            .select('approver_id')
            .eq('solicitation_id', sol.id)
            .eq('status', 'approved');

          const approverNames = await Promise.all(
            (approvalsData || []).map(async (a) => {
              const { data: name } = await (supabase.rpc as any)('get_approver_display_name', {
                _user_id: a.approver_id,
              });
              return (name as string) || "Aprovador";
            })
          );

          const { data: questionsData } = await supabase
            .from('approver_questions' as any)
            .select('answer')
            .eq('solicitation_id', sol.id);

          const pendingQuestions = ((questionsData as any[]) || []).filter((q) => !q.answer).length;

          const { count: userMessagesCount } = await supabase
            .from('solicitation_messages' as any)
            .select('*', { count: 'exact', head: true })
            .eq('solicitation_id', sol.id)
            .eq('channel', 'user')
            .eq('sender_id', sol.user_id);

          return {
            ...sol,
            quotes_count: count || 0,
            approver_names: approverNames,
            questions_count: ((questionsData as any[]) || []).length,
            pending_questions_count: pendingQuestions,
            user_messages_count: userMessagesCount || 0,
          } as SolicitationWithQuotes;
        })
      );

      setSolicitations(solicitationsWithQuotes);
    } catch (error) {
      console.error('Erro ao carregar solicitações:', error);
      toast.error("Erro ao carregar solicitações");
    } finally {
      setLoading(false);
    }
  };

  const getItemTitle = (solicitation: SolicitationWithQuotes) => {
    if (solicitation.request_type === "product") {
      return solicitation.product_name || "Produto";
    } else if (solicitation.request_type === "flight") {
      return `${solicitation.flight_origin} → ${solicitation.flight_destination}`;
    } else if (solicitation.request_type === "personalized_material") {
      return solicitation.material_type || "Material";
    } else if (solicitation.request_type === "apostilas") {
      return "Apostilas";
    } else if (solicitation.request_type === "cleaning_product") {
      return "Produtos de Limpeza";
    } else if (solicitation.request_type === "internal_requisition") {
      return "Requisição Interna";
    }
    return "—";
  };

  const getStatusBadge = (status: string, approvedCount: number, requestType?: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending_quotes: "secondary",
      pending_approval: "outline",
      approved_partial: "default",
      approved_released: "default",
      rejected: "destructive",
      delivered: "secondary",
    };

    const label =
      status === "approved_released" && requestType === "internal_requisition"
        ? "Solicitação aprovada e enviada para o estoque"
        : approvalStatusLabels[status] || status;

    const isLongInternalStatus = status === "approved_released" && requestType === "internal_requisition";

    return (
      <Badge
        variant={variants[status] || "secondary"}
        className={
          "inline-flex max-w-full items-center justify-center px-2.5 py-1 rounded-full text-xs font-medium leading-tight " +
          (isLongInternalStatus ? "whitespace-normal text-center " : "whitespace-nowrap ") +
          (status === "approved_released"
            ? "bg-green-500 hover:bg-green-600 text-white"
            : status === "approved_partial"
            ? "bg-yellow-500 hover:bg-yellow-600 text-black"
            : "")
        }
      >
        {label}
      </Badge>
    );
  };

  const matchesSearch = (s: SolicitationWithQuotes) =>
    s.requester_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.product_name && s.product_name.toLowerCase().includes(searchTerm.toLowerCase()));

  const statusTabs: { value: string; label: string; statuses: string[] | null }[] = [
    { value: "pending_approval", label: "Aguardando Aprovação", statuses: ["pending_approval", "approved_partial"] },
    { value: "pending_quotes", label: "Aguardando Orçamentos", statuses: ["pending_quotes"] },
    { value: "approved_released", label: "Liberados para Compra", statuses: ["approved_released"] },
    { value: "delivered", label: "Entregues", statuses: ["delivered"] },
    { value: "rejected", label: "Reprovados", statuses: ["rejected"] },
    { value: "all", label: "Todas", statuses: null },
  ];

  const countFor = (statuses: string[] | null) =>
    solicitations.filter((s) => (statuses ? statuses.includes(s.approval_status) : true)).length;

  const activeStatuses = statusTabs.find((t) => t.value === statusFilter)?.statuses ?? null;

  const filteredSolicitations = solicitations.filter(
    (s) => matchesSearch(s) && (activeStatuses ? activeStatuses.includes(s.approval_status) : true)
  );


  const openAnalysis = (id: string) => {
    setSelectedSolicitationId(id);
    setAnalysisOpen(true);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };





  if (!isApprover) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Análise de Aprovações</h1>
            <p className="text-muted-foreground text-lg">
              {canVote ? "Revise os orçamentos e aprove ou rejeite solicitações" : "Acompanhe pedidos liberados, pendentes e perguntas dos aprovadores"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => navigate("/")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>

        <Tabs defaultValue="approvals" className="space-y-6">
          <TabsList>
            <TabsTrigger value="approvals">Aprovações</TabsTrigger>
            <TabsTrigger value="purchases" className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" />
              Relatório de Compras
            </TabsTrigger>
            {VETO_APPROVER_EMAILS.includes(currentUserEmail.toLowerCase()) && (
              <TabsTrigger value="rejections" className="flex items-center gap-2">
                <Ban className="h-4 w-4" />
                Histórico de Reprovações
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="approvals" className="space-y-6">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, ID ou item..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filtro por status */}
            <div className="flex flex-wrap gap-2">
              {statusTabs.map((t) => {
                const active = statusFilter === t.value;
                return (
                  <Button
                    key={t.value}
                    size="sm"
                    variant={active ? "default" : "outline"}
                    onClick={() => setStatusFilter(t.value)}
                    className="rounded-full"
                  >
                    {t.label}
                    <Badge
                      variant="secondary"
                      className="ml-2 px-1.5 py-0 text-[10px] font-semibold"
                    >
                      {countFor(t.statuses)}
                    </Badge>
                  </Button>
                );
              })}
            </div>



            {/* Table */}
            <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
              <Table className="w-full table-fixed text-xs xl:text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[70px]">ID</TableHead>
                    <TableHead className="w-[78px]">Data</TableHead>
                    <TableHead className="w-[130px]">Solicitante</TableHead>
                    <TableHead className="w-[90px]">Tipo</TableHead>
                    <TableHead className="w-[140px]">Item</TableHead>
                    <TableHead className="w-[110px]">Orçamentos</TableHead>
                    <TableHead className="w-[210px]">Status</TableHead>
                    <TableHead className="w-[110px]">Perguntas</TableHead>
                    <TableHead className="w-[110px]">Mensagens</TableHead>
                    <TableHead className="w-[110px]">Aprovado por</TableHead>
                    <TableHead className="w-[70px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-12 text-muted-foreground">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : filteredSolicitations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-12 text-muted-foreground">
                        Nenhuma solicitação para análise
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSolicitations.map((solicitation) => (
                      <TableRow key={solicitation.id}>
                        <TableCell className="font-mono text-xs">
                          {solicitation.id.slice(0, 8)}
                        </TableCell>
                        <TableCell>
                          {format(new Date(solicitation.created_at), "dd/MM/yy", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="font-medium truncate">
                          {solicitation.requester_name}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {requestTypeLabels[solicitation.request_type]}
                          </span>
                        </TableCell>
                        <TableCell className="truncate">
                          {getItemTitle(solicitation)}
                        </TableCell>
                        <TableCell>
                          <div className="flex min-w-0 items-center gap-1">
                            <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span className={(solicitation.quotes_count >= 1 ? "text-green-600 font-medium" : "text-yellow-600") + " leading-tight"}>
                              {solicitation.quotes_count} anexado(s)
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(solicitation.approval_status, solicitation.approved_count, solicitation.request_type)}
                        </TableCell>
                        <TableCell>
                          {solicitation.pending_questions_count > 0 ? (
                            <Badge className="bg-yellow-500 text-black">
                              <MessageCircleQuestion className="h-3 w-3 mr-1" />
                              {solicitation.pending_questions_count} pendente(s)
                            </Badge>
                          ) : solicitation.questions_count > 0 ? (
                            <Badge variant="outline">Respondida</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
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
                          {solicitation.approver_names.length === 0 ? (
                            <span className="text-xs text-muted-foreground">—</span>
                          ) : (
                            <div className="flex flex-col gap-1">
                              {solicitation.approver_names.map((name, idx) => (
                                <span key={idx} className="text-xs font-medium">
                                  ✓ {name}
                                </span>
                              ))}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openAnalysis(solicitation.id)}
                          >
                            {canVote && solicitation.approval_status !== "delivered" ? "Analisar" : "Ver"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="purchases">
            <PurchasesReport />
          </TabsContent>

          {VETO_APPROVER_EMAILS.includes(currentUserEmail.toLowerCase()) && (
            <TabsContent value="rejections">
              <RejectionsHistory onOpenAnalysis={openAnalysis} />
            </TabsContent>
          )}
        </Tabs>

        {/* Analysis Dialog */}
        <AnalysisDialog
          solicitationId={selectedSolicitationId}
          open={analysisOpen}
          onOpenChange={setAnalysisOpen}
          onSuccess={loadSolicitations}
          approverEmail={currentUserEmail}
          readOnly={!canVote}
          canAnswerQuestions={canAnswerQuestions}
        />
      </div>
    </div>
  );
};

export default ApprovalAnalysis;