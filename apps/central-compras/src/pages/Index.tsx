import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Filter, LogOut, AlertTriangle } from "lucide-react";
import { StatusBadge, RequesterStatusBadge } from "@/components/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { NewRequestDialog } from "@/components/NewRequestDialog";
import { RequestDetailsDialog } from "@/components/RequestDetailsDialog";
import { RealtimeNotifications } from "@/components/RealtimeNotifications";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Session } from "@supabase/supabase-js";
import { formatDateOnly } from "@/lib/utils";

interface Solicitation {
  id: string;
  created_at: string;
  requester_name: string;
  request_type: string;
  product_name: string | null;
  flight_origin: string | null;
  flight_destination: string | null;
  material_type: string | null;
  status: "pending" | "approved" | "rejected" | "purchasing" | "delivered";
  estimated_arrival_date: string | null;
  updated_at: string;
  is_urgent?: boolean;
  stock_status?: string | null;
  approval_status?: string | null;
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

const mustResetPassword = (session: Session | null) =>
  session?.user?.user_metadata?.must_reset_password === true;

const Index = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [userName, setUserName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isStock, setIsStock] = useState(false);
  

  const [isApprover, setIsApprover] = useState(false);
  const [solicitations, setSolicitations] = useState<Solicitation[]>([]);
  const [filteredSolicitations, setFilteredSolicitations] = useState<Solicitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [newRequestOpen, setNewRequestOpen] = useState(false);
  const [newRequestUrgent, setNewRequestUrgent] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedSolicitationId, setSelectedSolicitationId] = useState<string | null>(null);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  useEffect(() => {
    // Setup auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        if (!session) {
          navigate("/auth");
        } else if (mustResetPassword(session)) {
          navigate("/reset-password");
        } else {
          setTimeout(() => {
            loadUserProfile(session.user.id);
            loadSolicitations();
          }, 0);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      } else if (mustResetPassword(session)) {
        navigate("/reset-password");
      } else {
        loadUserProfile(session.user.id);
        loadSolicitations();
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    applyFilters();
  }, [solicitations, searchTerm, statusFilter, typeFilter]);

  const loadUserProfile = async (userId: string) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', userId)
        .single();

      setUserName(profile?.full_name || "");

      // Check if user is admin or super_admin
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      const userIsAdmin = roles?.some(r => r.role === 'admin') || false;
      const userIsSuperAdmin = roles?.some(r => r.role === 'super_admin') || false;
      const userIsStock = roles?.some(r => r.role === 'stock') || false;

      setIsAdmin(userIsAdmin);
      setIsSuperAdmin(userIsSuperAdmin);

      // Stock pode usar o portal normalmente (também faz solicitações).
      // Botão dedicado no topo dá acesso à área de estoque.
      setIsStock(userIsStock);


      // Redirecionar admin para área admin automaticamente
      if (userIsAdmin && !userIsSuperAdmin) {
        navigate("/admin");
        return;
      }

      // Check if user is approver
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        const { data: approver } = await supabase
          .from('approvers')
          .select('email')
          .eq('email', user.email)
          .maybeSingle();
        setIsApprover(!!approver);
      }
    } catch (error) {
      console.error("Erro ao carregar perfil:", error);
    }
  };

  const loadSolicitations = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const { data, error } = await supabase
        .from('solicitations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setSolicitations((data as Solicitation[]) || []);
    } catch (error) {
      console.error('Erro ao carregar solicitações:', error);
      toast.error("Erro ao carregar solicitações");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...solicitations];

    // Filtro de busca
    if (searchTerm) {
      filtered = filtered.filter((s) =>
        s.requester_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.product_name && s.product_name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Filtro de status
    if (statusFilter !== "all") {
      filtered = filtered.filter((s) => s.status === statusFilter);
    }

    // Filtro de tipo
    if (typeFilter !== "all") {
      filtered = filtered.filter((s) => s.request_type === typeFilter);
    }

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
    } else if (solicitation.request_type === "apostilas") {
      return "Apostilas";
    } else if (solicitation.request_type === "cleaning_product") {
      return "Produtos de Limpeza";
    } else if (solicitation.request_type === "internal_requisition") {
      return "Requisição Interna";
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

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Real-time notifications */}
      <RealtimeNotifications userId={session.user.id} />
      
      <div className="container mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Central de Compras Interna</h1>
            <p className="text-muted-foreground text-lg">
              Solicitação e acompanhamento de compras, passagens e materiais personalizados
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              Olá, <span className="font-medium">{userName}</span>
            </span>
            {isApprover && (
              <Button variant="outline" onClick={() => navigate("/approvals")}>
                Análise de Aprovações
              </Button>
            )}
            {isSuperAdmin && (
              <Button variant="outline" onClick={() => navigate("/super-admin")}>
                Gestão de Entregas
              </Button>
            )}
            {(isStock || isAdmin || isSuperAdmin) && (
              <Button variant="outline" onClick={() => navigate("/estoque")}>
                Estoque
              </Button>
            )}

            {isAdmin && (
              <Button onClick={() => navigate("/admin")}>
                Área Admin
              </Button>
            )}
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-2">
            {!isAdmin && (
              <Button onClick={() => { setNewRequestUrgent(false); setNewRequestOpen(true); }} size="lg">
                <Plus className="mr-2 h-5 w-5" />
                Nova Solicitação
              </Button>
            )}
            <Button
              onClick={() => { setNewRequestUrgent(true); setNewRequestOpen(true); }}
              size="lg"
              variant="destructive"
            >
              <AlertTriangle className="mr-2 h-5 w-5" />
              Compra de Urgência
            </Button>
          </div>

          <div className="flex-1 flex flex-col lg:flex-row gap-3">
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
                <SelectItem value="internal_requisition">Requisição Interna</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Mensagem para admins */}
        {isAdmin && (
          <div className="mb-6 p-4 bg-primary/10 border border-primary/20 rounded-lg">
            <p className="text-primary font-medium">
              👋 Você está logado como administrador. Para gerenciar solicitações e enviar orçamentos, acesse a{" "}
              <Button variant="link" className="p-0 h-auto text-primary font-bold" onClick={() => navigate("/admin")}>
                Área Admin
              </Button>.
            </p>
          </div>
        )}

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
                <TableHead>Previsão</TableHead>
                <TableHead>Atualizado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filteredSolicitations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
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
                        {solicitation.is_urgent && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-destructive text-destructive-foreground shrink-0">
                            <AlertTriangle className="h-3 w-3" /> URGENTE
                          </span>
                        )}
                        <span className="truncate">{getItemTitle(solicitation)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {solicitation.request_type === "internal_requisition" && solicitation.stock_status === "ready_pickup" && solicitation.status !== "delivered" ? (
                        <Badge className="bg-emerald-600 text-white hover:bg-emerald-600/90">Pronto para retirada</Badge>
                      ) : solicitation.request_type === "internal_requisition" && solicitation.stock_status === "separating" && solicitation.status !== "delivered" ? (
                        <Badge className="bg-amber-500 text-white hover:bg-amber-500/90">Separando peças</Badge>
                      ) : (
                        <RequesterStatusBadge status={solicitation.status} approvalStatus={solicitation.approval_status} requestType={solicitation.request_type} />
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

        {/* Dialogs */}
        <NewRequestDialog
          open={newRequestOpen}
          onOpenChange={setNewRequestOpen}
          onSuccess={loadSolicitations}
          defaultUrgent={newRequestUrgent}
        />

        <RequestDetailsDialog
          solicitationId={selectedSolicitationId}
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
          onSuccess={loadSolicitations}
          adminMode={false}
        />
      </div>
    </div>
  );
};

export default Index;
