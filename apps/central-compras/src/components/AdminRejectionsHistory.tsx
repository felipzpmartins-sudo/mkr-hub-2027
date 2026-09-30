import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, XCircle, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface RejectionEntry {
  id: string;
  solicitation_id: string;
  actor_name: string;
  created_at: string;
  justification: string | null;
  requester_name: string;
  request_type: string;
  item_title: string;
}

const requestTypeLabels: Record<string, string> = {
  product: "Produto",
  flight: "Passagem",
  personalized_material: "Material",
  accommodation: "Hospedagem",
  apostilas: "Apostilas",
  cleaning_product: "Produto de Limpeza",
};

interface AdminRejectionsHistoryProps {
  onOpenDetails: (solicitationId: string) => void;
}

export const AdminRejectionsHistory = ({ onOpenDetails }: AdminRejectionsHistoryProps) => {
  const [entries, setEntries] = useState<RejectionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadRejections();
  }, []);

  const loadRejections = async () => {
    setLoading(true);
    try {
      const { data: history, error } = await supabase
        .from("status_history")
        .select("*")
        .eq("new_status", "admin_rejected")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const enriched = await Promise.all(
        (history || []).map(async (entry) => {
          const { data: sol } = await supabase
            .from("solicitations")
            .select("id, requester_name, request_type, product_name, flight_origin, flight_destination, material_type")
            .eq("id", entry.solicitation_id)
            .maybeSingle();

          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", entry.changed_by)
            .maybeSingle();

          let itemTitle = "—";
          if (sol) {
            if (sol.request_type === "product") itemTitle = sol.product_name || "Produto";
            else if (sol.request_type === "flight") itemTitle = `${sol.flight_origin} → ${sol.flight_destination}`;
            else if (sol.request_type === "personalized_material") itemTitle = sol.material_type || "Material";
          }

          return {
            id: entry.id,
            solicitation_id: entry.solicitation_id,
            actor_name: profile?.full_name || "Administrador",
            created_at: entry.created_at,
            justification: entry.justification,
            requester_name: sol?.requester_name || "—",
            request_type: sol?.request_type || "—",
            item_title: itemTitle,
          } as RejectionEntry;
        })
      );

      setEntries(enriched);
    } catch (err) {
      console.error("Erro ao carregar histórico de rejeições:", err);
      toast.error("Erro ao carregar histórico de rejeições");
    } finally {
      setLoading(false);
    }
  };

  const filtered = entries.filter(
    (e) =>
      e.requester_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.item_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.actor_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por solicitante, item ou administrador..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="bg-card rounded-lg border shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Solicitante</TableHead>
              <TableHead>Item</TableHead>
              <TableHead>Rejeitado por</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  Nenhuma solicitação rejeitada
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="text-sm whitespace-nowrap">
                    {format(new Date(entry.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                  </TableCell>
                  <TableCell className="font-medium">{entry.requester_name}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm">{entry.item_title}</span>
                      <span className="text-xs text-muted-foreground">
                        {requestTypeLabels[entry.request_type] || entry.request_type}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    <Badge variant="destructive" className="gap-1">
                      <XCircle className="h-3 w-3" />
                      {entry.actor_name}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-md">
                    {entry.justification ? (
                      <p className="text-sm text-muted-foreground italic whitespace-pre-wrap break-words">
                        "{entry.justification}"
                      </p>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onOpenDetails(entry.solicitation_id)}
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      Ver
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
