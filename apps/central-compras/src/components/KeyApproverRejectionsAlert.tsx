import { useEffect, useState } from "react";
import { AlertTriangle, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const KEY_APPROVER_EMAILS = ["ceo@makergrupo.com.br", "controller@makergrupo.com.br"];

interface FlaggedItem {
  solicitation_id: string;
  requester_name: string;
  item_title: string;
  approver_names: string[];
  type: "rejection" | "veto";
  justification: string | null;
  created_at: string;
}

interface KeyApproverRejectionsAlertProps {
  onOpenDetails: (solicitationId: string) => void;
}

export const KeyApproverRejectionsAlert = ({ onOpenDetails }: KeyApproverRejectionsAlertProps) => {
  const [items, setItems] = useState<FlaggedItem[]>([]);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      // Get user_ids of Rafael & Alberto via approvers table -> auth users
      const { data: history } = await supabase
        .from("status_history")
        .select("*")
        .in("new_status", ["approval_vote_rejected", "vetoed_redo_quotes"])
        .order("created_at", { ascending: false });

      if (!history || history.length === 0) return;

      // Get approver names via RPC and filter by Rafael/Alberto
      const enriched = await Promise.all(
        history.map(async (entry) => {
          const { data: name } = await (supabase.rpc as any)("get_approver_display_name", {
            _user_id: entry.changed_by,
          });
          return { entry, name: (name as string) || "" };
        })
      );

      const filtered = enriched.filter(({ name }) => {
        const n = name.toLowerCase();
        return n.includes("rafael") || n.includes("alberto");
      });

      // Get super_admin user_ids (Richard) to exclude solicitations he already acted on
      const { data: superAdmins } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "super_admin");
      const superAdminIds = new Set((superAdmins || []).map((r: any) => r.user_id));

      // Group by solicitation_id, but only keep solicitations still active (not delivered/rejected finally)
      const bySol = new Map<string, { entries: typeof filtered; }>();
      for (const item of filtered) {
        const sid = item.entry.solicitation_id;
        if (!bySol.has(sid)) bySol.set(sid, { entries: [] });
        bySol.get(sid)!.entries.push(item);
      }

      const results: FlaggedItem[] = [];
      for (const [sid, { entries }] of bySol) {
        // Skip if Richard (super_admin) has already acted on this solicitation
        const { data: superAdminActions } = await supabase
          .from("status_history")
          .select("id")
          .eq("solicitation_id", sid)
          .in("changed_by", Array.from(superAdminIds) as string[])
          .limit(1);
        if (superAdminActions && superAdminActions.length > 0) continue;

        const { data: sol } = await supabase
          .from("solicitations")
          .select("id, requester_name, request_type, product_name, flight_origin, flight_destination, material_type, status, approval_status")
          .eq("id", sid)
          .maybeSingle();

        if (!sol) continue;
        // Skip already finalized as delivered
        if (sol.status === "delivered" || sol.approval_status === "delivered") continue;

        let itemTitle = "—";
        if (sol.request_type === "product") itemTitle = sol.product_name || "Produto";
        else if (sol.request_type === "flight") itemTitle = `${sol.flight_origin} → ${sol.flight_destination}`;
        else if (sol.request_type === "personalized_material") itemTitle = sol.material_type || "Material";

        const latest = entries[0];
        const approverNames = Array.from(new Set(entries.map((e) => e.name)));

        results.push({
          solicitation_id: sid,
          requester_name: sol.requester_name,
          item_title: itemTitle,
          approver_names: approverNames,
          type: latest.entry.new_status === "vetoed_redo_quotes" ? "veto" : "rejection",
          justification: latest.entry.justification,
          created_at: latest.entry.created_at,
        });
      }

      setItems(results);
    } catch (err) {
      console.error("Erro ao carregar alertas de reprovações:", err);
    }
  };

  if (items.length === 0) return null;

  return (
    <div className="rounded-lg border-2 border-destructive/50 bg-destructive/5 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-destructive" />
        <h3 className="font-semibold text-destructive">
          {items.length} {items.length === 1 ? "pedido" : "pedidos"} com reprovação de Rafael ou Alberto
        </h3>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.solicitation_id}
            className="flex items-start justify-between gap-3 rounded-md bg-card border p-3"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">{item.requester_name}</span>
                <span className="text-muted-foreground text-sm">—</span>
                <span className="text-sm">{item.item_title}</span>
                <Badge variant={item.type === "veto" ? "destructive" : "destructive"} className="text-xs">
                  {item.type === "veto" ? "Refazer orçamentos" : "Rejeitado"}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Por: {item.approver_names.join(", ")}
              </p>
              {item.justification && (
                <p className="text-xs italic text-muted-foreground mt-1 line-clamp-2">
                  "{item.justification}"
                </p>
              )}
            </div>
            <Button size="sm" variant="outline" onClick={() => onOpenDetails(item.solicitation_id)}>
              Ver
              <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};
