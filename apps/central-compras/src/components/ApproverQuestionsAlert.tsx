import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { MessageCircleQuestion } from "lucide-react";

interface Item {
  id: string;
  solicitation_id: string;
  question: string;
  approver_name?: string;
  requester_name?: string;
}

export const ApproverQuestionsAlert = ({
  onOpenDetails,
}: {
  onOpenDetails: (solicitationId: string) => void;
}) => {
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const { data } = await supabase
      .from("approver_questions" as any)
      .select("id, solicitation_id, question, approver_id")
      .is("answer", null)
      .order("created_at", { ascending: false });
    if (!data) return;
    const enriched = await Promise.all(
      (data as any[]).map(async (q) => {
        const { data: name } = await (supabase.rpc as any)(
          "get_approver_display_name",
          { _user_id: q.approver_id },
        );
        const { data: sol } = await supabase
          .from("solicitations")
          .select("requester_name")
          .eq("id", q.solicitation_id)
          .single();
        return {
          id: q.id,
          solicitation_id: q.solicitation_id,
          question: q.question,
          approver_name: (name as string) || "Aprovador",
          requester_name: sol?.requester_name,
        } as Item;
      }),
    );
    setItems(enriched);
  };

  if (items.length === 0) return null;

  return (
    <Alert className="mb-6 border-yellow-400 bg-yellow-50">
      <MessageCircleQuestion className="h-4 w-4 text-yellow-700" />
      <AlertTitle className="text-yellow-800">
        {items.length} pergunta(s) de aprovadores aguardando resposta
      </AlertTitle>
      <AlertDescription>
        <div className="mt-2 space-y-2">
          {items.slice(0, 5).map((q) => (
            <div
              key={q.id}
              className="flex items-start justify-between gap-3 p-2 rounded bg-background border"
            >
              <div className="text-sm min-w-0">
                <div className="font-medium">
                  {q.approver_name} · pedido de {q.requester_name}
                </div>
                <p className="italic text-muted-foreground truncate">
                  "{q.question}"
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onOpenDetails(q.solicitation_id)}
              >
                Responder
              </Button>
            </div>
          ))}
        </div>
      </AlertDescription>
    </Alert>
  );
};
