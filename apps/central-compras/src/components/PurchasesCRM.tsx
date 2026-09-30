import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ShoppingCart, Truck, Clock, XCircle, Package, GripVertical, MessageCircle, User, Phone, Mail, ExternalLink, Trash2, FileText, Search, Filter } from "lucide-react";
import { RequestDetailsDialog } from "./RequestDetailsDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { isPast, isToday } from "date-fns";
import { formatDateOnly, parseDateOnly, todayLocalISO } from "@/lib/utils";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";

interface Solicitation {
  id: string;
  created_at: string;
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
}

interface PurchasesCRMProps {
  solicitations: Solicitation[];
  onUpdate: () => void;
}

const requestTypeLabels: Record<string, string> = {
  product: "Produto",
  flight: "Passagem",
  personalized_material: "Material",
  apostilas: "Apostilas",
  cleaning_product: "Produto de Limpeza",
  internal_requisition: "Requisição Interna",
};

type CRMColumn = "purchasing" | "delivered" | "late" | "rejected";

const quickMessages = [
  "Olá! Seu pedido chegou e já está pronto para retirada. 📦",
  "Olá! Temos uma atualização sobre seu pedido. Entre em contato conosco.",
];

// Draggable Card Component
const DraggableCard = ({ 
  item, 
  getItemTitle, 
  isLate,
  onClick,
  onFullDetails,
}: { 
  item: Solicitation; 
  getItemTitle: (s: Solicitation) => string;
  isLate: (s: Solicitation) => boolean;
  onClick: () => void;
  onFullDetails: () => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
    data: { item },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`min-w-0 cursor-grab active:cursor-grabbing hover:border-primary/50 transition-colors ${
        isDragging ? "opacity-50 shadow-lg" : ""
      }`}
      {...listeners}
      {...attributes}
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm leading-snug line-clamp-2 break-words">
                {getItemTitle(item)}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {item.requester_name}
              </p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs shrink-0">
            {requestTypeLabels[item.request_type]}
          </Badge>
        </div>
        
        {item.estimated_arrival_date && (
          <p className={`text-xs ${isLate(item) ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
            Previsão: {formatDateOnly(item.estimated_arrival_date, "dd/MM/yy")}
          </p>
        )}

        <div className="grid grid-cols-2 gap-1.5 pt-1" onPointerDown={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 min-w-0 px-2 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              onFullDetails();
            }}
          >
            <FileText className="h-3 w-3 mr-1" />
            Ver detalhes
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 min-w-0 px-2 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
          >
            <MessageCircle className="h-3 w-3 mr-1" />
            WhatsApp
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Droppable Column Component
const DroppableColumn = ({ 
  column, 
  children 
}: { 
  column: { id: CRMColumn; title: string; icon: typeof ShoppingCart; color: string; items: Solicitation[] };
  children: React.ReactNode;
}) => {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  return (
    <Card className={`min-w-0 flex flex-col transition-colors ${isOver ? "ring-2 ring-primary bg-primary/5" : ""}`}>
      <CardHeader className="px-4 pb-3 pt-4">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <div className={`p-1.5 rounded ${column.color}`}>
            <column.icon className="h-4 w-4 text-white" />
          </div>
          <span className="min-w-0 truncate">{column.title}</span>
          <Badge variant="secondary" className="ml-auto">
            {column.items.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent ref={setNodeRef} className="flex-1 p-2 min-h-[400px]">
        <ScrollArea className="h-[400px]">
          <div className="space-y-2 p-1">
            {children}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export const PurchasesCRM = ({ solicitations, onUpdate }: PurchasesCRMProps) => {
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Solicitation | null>(null);
  const [targetColumn, setTargetColumn] = useState<CRMColumn | null>(null);
  const [observations, setObservations] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState(quickMessages[0]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Solicitation | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [fullDetailsOpen, setFullDetailsOpen] = useState(false);
  const [fullDetailsId, setFullDetailsId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const openDetails = (item: Solicitation) => {
    setSelectedItem(item);
    setSelectedMessage(quickMessages[0]);
    setDetailsDialogOpen(true);
  };

  const openDeleteDialog = (item: Solicitation) => {
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;
    
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('solicitations')
        .delete()
        .eq('id', itemToDelete.id);

      if (error) throw error;

      toast.success("Pedido apagado com sucesso!");
      setDeleteDialogOpen(false);
      setDetailsDialogOpen(false);
      setItemToDelete(null);
      onUpdate();
    } catch (error) {
      console.error("Erro ao apagar:", error);
      toast.error("Erro ao apagar pedido");
    } finally {
      setDeleting(false);
    }
  };

  const formatPhoneForWhatsApp = (phone: string) => {
    // Remove tudo exceto números
    const cleaned = phone.replace(/\D/g, '');
    // Adiciona 55 (Brasil) se não tiver
    if (cleaned.length <= 11) {
      return `55${cleaned}`;
    }
    return cleaned;
  };

  const openWhatsApp = (phone: string, message: string) => {
    const formattedPhone = formatPhoneForWhatsApp(phone);
    const encodedMessage = encodeURIComponent(message);
    window.open(`https://wa.me/${formattedPhone}?text=${encodedMessage}`, '_blank');
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  function isLate(solicitation: Solicitation): boolean {
    if (!solicitation.estimated_arrival_date) return false;
    if (solicitation.status === 'delivered') return false;
    const estimatedDate = parseDateOnly(solicitation.estimated_arrival_date);
    if (!estimatedDate) return false;
    return isPast(estimatedDate) && !isToday(estimatedDate);
  }

  // Filtrar solicitações por status
  // Aplicar filtros de busca e tipo
  const term = searchTerm.trim().toLowerCase();
  const matchesFilters = (s: Solicitation) => {
    if (typeFilter !== "all" && s.request_type !== typeFilter) return false;
    if (!term) return true;
    return (
      (s.requester_name || "").toLowerCase().includes(term) ||
      (s.product_name || "").toLowerCase().includes(term) ||
      (s.material_type || "").toLowerCase().includes(term) ||
      (s.flight_origin || "").toLowerCase().includes(term) ||
      (s.flight_destination || "").toLowerCase().includes(term) ||
      (s.general_description || "").toLowerCase().includes(term) ||
      s.id.toLowerCase().includes(term)
    );
  };
  const filteredSolicitations = solicitations.filter(matchesFilters);

  // Filtrar solicitações por status
  const purchasingSolicitations = filteredSolicitations.filter(
    s => s.status === 'purchasing' && 
         s.approval_status !== 'rejected' && 
         s.approval_status !== 'delivered' &&
         !isLate(s)
  );

  const deliveredSolicitations = filteredSolicitations.filter(
    s => s.status === 'delivered' || s.approval_status === 'delivered'
  );

  const lateSolicitations = filteredSolicitations.filter(
    s => isLate(s) && s.status !== 'delivered' && s.approval_status !== 'rejected'
  );

  const rejectedSolicitations = filteredSolicitations.filter(
    s => s.approval_status === 'rejected'
  );

  const getItemTitle = (solicitation: Solicitation) => {
    if (solicitation.request_type === "product") {
      return solicitation.product_name || "Produto";
    } else if (solicitation.request_type === "flight") {
      return `${solicitation.flight_origin} → ${solicitation.flight_destination}`;
    } else if (solicitation.request_type === "personalized_material") {
      return solicitation.material_type || "Material";
    }
    return "—";
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const targetColumnId = over.id as CRMColumn;
    const item = active.data.current?.item as Solicitation;

    if (!item) return;

    // Determine current column of the item
    const getCurrentColumn = (): CRMColumn => {
      if (item.status === 'delivered' || item.approval_status === 'delivered') return 'delivered';
      if (item.approval_status === 'rejected') return 'rejected';
      if (isLate(item)) return 'late';
      return 'purchasing';
    };

    const currentColumn = getCurrentColumn();
    
    // If dropping in the same column, do nothing
    if (currentColumn === targetColumnId) return;

    // For delivered column, show dialog to add delivery date
    if (targetColumnId === 'delivered') {
      setSelectedItem(item);
      setTargetColumn(targetColumnId);
      setObservations(item.delivery_observations || "");
      setDeliveryDate(item.actual_delivery_date || "");
      setMoveDialogOpen(true);
      return;
    }

    // For other columns, move directly
    await moveItem(item, targetColumnId);
  };

  const moveItem = async (item: Solicitation, column: CRMColumn, extraData?: { observations?: string; deliveryDate?: string }) => {
    setSaving(true);
    try {
      let updateData: Record<string, unknown> = {
        delivery_observations: extraData?.observations || item.delivery_observations || null,
      };

      switch (column) {
        case "purchasing":
          updateData.status = "purchasing";
          updateData.approval_status = "approved_released";
          updateData.actual_delivery_date = null;
          break;
        case "delivered":
          updateData.status = "delivered";
          updateData.approval_status = "delivered";
          updateData.actual_delivery_date = extraData?.deliveryDate || todayLocalISO();
          break;
        case "rejected":
          updateData.status = "rejected";
          updateData.approval_status = "rejected";
          break;
        case "late":
          // Keep current status, just add late marker to observations
          updateData.delivery_observations = `[ATRASADO] ${extraData?.observations || item.delivery_observations || ""}`;
          break;
      }

      const { error } = await supabase
        .from('solicitations')
        .update(updateData)
        .eq('id', item.id);

      if (error) throw error;

      toast.success("Pedido movido com sucesso!");
      onUpdate();
    } catch (error) {
      console.error("Erro ao mover:", error);
      toast.error("Erro ao mover pedido");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmMove = async () => {
    if (!selectedItem || !targetColumn) return;
    await moveItem(selectedItem, targetColumn, { observations, deliveryDate });
    setMoveDialogOpen(false);
  };

  const columns = [
    {
      id: "purchasing" as CRMColumn,
      title: "Compra Realizada",
      icon: ShoppingCart,
      color: "bg-blue-500",
      items: purchasingSolicitations,
    },
    {
      id: "delivered" as CRMColumn,
      title: "Pedido Entregue",
      icon: Truck,
      color: "bg-green-500",
      items: deliveredSolicitations,
    },
    {
      id: "late" as CRMColumn,
      title: "Pedido Atrasado",
      icon: Clock,
      color: "bg-amber-500",
      items: lateSolicitations,
    },
    {
      id: "rejected" as CRMColumn,
      title: "Pedidos Rejeitados",
      icon: XCircle,
      color: "bg-red-500",
      items: rejectedSolicitations,
    },
  ];

  const getColumnLabel = (column: CRMColumn) => {
    switch (column) {
      case "purchasing": return "Compra Realizada";
      case "delivered": return "Pedido Entregue";
      case "late": return "Pedido Atrasado";
      case "rejected": return "Pedido Rejeitado";
    }
  };

  const activeItem = activeId ? solicitations.find(s => s.id === activeId) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <GripVertical className="h-4 w-4" />
        <span>Arraste os cards para mover entre as colunas</span>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por solicitante, item, descrição, ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-[220px]">
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

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {/* CRM Board */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {columns.map((column) => (
            <DroppableColumn key={column.id} column={column}>
              {column.items.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-8">
                  Nenhum item
                </p>
              ) : (
                column.items.map((item) => (
                  <DraggableCard
                    key={item.id}
                    item={item}
                    getItemTitle={getItemTitle}
                    isLate={isLate}
                    onClick={() => openDetails(item)}
                    onFullDetails={() => {
                      setFullDetailsId(item.id);
                      setFullDetailsOpen(true);
                    }}
                  />
                ))
              )}
            </DroppableColumn>
          ))}
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeItem && (
            <Card className="cursor-grabbing shadow-xl border-primary">
              <CardContent className="p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {getItemTitle(activeItem)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {activeItem.requester_name}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0">
                    {requestTypeLabels[activeItem.request_type]}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}
        </DragOverlay>
      </DndContext>

      {/* Move Dialog (for delivered column) */}
      <Dialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Mover para {targetColumn && getColumnLabel(targetColumn)}
            </DialogTitle>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{getItemTitle(selectedItem)}</p>
                <p className="text-sm text-muted-foreground">{selectedItem.requester_name}</p>
              </div>

              {targetColumn === "delivered" && (
                <div className="space-y-2">
                  <Label>Data de Entrega</Label>
                  <Input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  placeholder="Adicione observações..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setMoveDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleConfirmMove} disabled={saving}>
                  {saving ? "Salvando..." : "Confirmar"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Details Dialog with WhatsApp */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Detalhes do Pedido
            </DialogTitle>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-4">
              {/* Item Info */}
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{getItemTitle(selectedItem)}</p>
                <Badge variant="outline" className="mt-1">
                  {requestTypeLabels[selectedItem.request_type]}
                </Badge>
                {selectedItem.estimated_arrival_date && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Previsão: {formatDateOnly(selectedItem.estimated_arrival_date)}
                  </p>
                )}
              </div>

              {/* User Info */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm">Informações do Solicitante</h4>
                
                <div className="flex items-center gap-3 p-2 bg-muted/50 rounded">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{selectedItem.requester_name}</span>
                </div>

                <div className="flex items-center gap-3 p-2 bg-muted/50 rounded">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{selectedItem.requester_phone}</span>
                </div>

                {selectedItem.requester_email && (
                  <div className="flex items-center gap-3 p-2 bg-muted/50 rounded">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{selectedItem.requester_email}</span>
                  </div>
                )}
              </div>

              {/* WhatsApp Section */}
              <div className="space-y-3 border-t pt-4">
                <h4 className="font-medium text-sm flex items-center gap-2">
                  <MessageCircle className="h-4 w-4 text-green-500" />
                  Mensagem Rápida WhatsApp
                </h4>
                
                <div className="space-y-2">
                  {quickMessages.map((msg, index) => (
                    <label
                      key={index}
                      className={`flex items-start gap-2 p-2 rounded cursor-pointer transition-colors ${
                        selectedMessage === msg 
                          ? "bg-green-50 border border-green-200" 
                          : "bg-muted/50 hover:bg-muted"
                      }`}
                    >
                      <input
                        type="radio"
                        name="quickMessage"
                        checked={selectedMessage === msg}
                        onChange={() => setSelectedMessage(msg)}
                        className="mt-1"
                      />
                      <span className="text-sm">{msg}</span>
                    </label>
                  ))}
                </div>

                <Button 
                  className="w-full bg-green-500 hover:bg-green-600"
                  onClick={() => openWhatsApp(selectedItem.requester_phone, selectedMessage)}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Abrir WhatsApp
                  <ExternalLink className="h-3 w-3 ml-2" />
                </Button>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setFullDetailsId(selectedItem.id);
                  setFullDetailsOpen(true);
                }}
              >
                <FileText className="h-4 w-4 mr-2" />
                Ver solicitação completa
              </Button>

              <div className="flex justify-between pt-2 border-t mt-4">
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => openDeleteDialog(selectedItem)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Apagar Pedido
                </Button>
                <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <RequestDetailsDialog
        solicitationId={fullDetailsId}
        open={fullDetailsOpen}
        onOpenChange={setFullDetailsOpen}
        onSuccess={onUpdate}
        adminMode={true}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apagar Pedido?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O pedido{" "}
              <strong>{itemToDelete && getItemTitle(itemToDelete)}</strong> será 
              permanentemente removido do sistema.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete} 
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Apagando..." : "Apagar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
