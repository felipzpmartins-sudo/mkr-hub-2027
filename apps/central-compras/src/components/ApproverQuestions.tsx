import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { HelpCircle, Loader2, MessageCircleQuestion, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Question {
  id: string;
  approver_id: string;
  question: string;
  answer: string | null;
  answered_at: string | null;
  answered_by: string | null;
  created_at: string;
  approver_name?: string;
  answered_by_name?: string;
}

interface Props {
  solicitationId: string;
  /** admin/super_admin can answer */
  canAnswer?: boolean;
  /** current user is an approver (can ask) */
  canAsk?: boolean;
  /** solicitation snapshot for email notification */
  requesterName?: string;
  requestType?: string;
  onUpdated?: () => void;
}

export const ApproverQuestions = ({
  solicitationId,
  canAnswer = false,
  canAsk = false,
  requesterName,
  requestType,
  onUpdated,
}: Props) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [newQuestion, setNewQuestion] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});
  const [answering, setAnswering] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    load();
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null));
  }, [solicitationId]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("approver_questions" as any)
      .select("*")
      .eq("solicitation_id", solicitationId)
      .order("created_at", { ascending: true });
    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }
    const withNames = await Promise.all(
      ((data as any[]) || []).map(async (q) => {
        const { data: askerName } = await (supabase.rpc as any)(
          "get_approver_display_name",
          { _user_id: q.approver_id },
        );
        let answered_by_name: string | undefined;
        if (q.answered_by) {
          const { data: n } = await (supabase.rpc as any)(
            "get_approver_display_name",
            { _user_id: q.answered_by },
          );
          answered_by_name = (n as string) || "Admin";
        }
        return {
          ...q,
          approver_name: (askerName as string) || "Aprovador",
          answered_by_name,
        } as Question;
      }),
    );
    setQuestions(withNames);
    setLoading(false);
  };

  const submitQuestion = async () => {
    const q = newQuestion.trim();
    if (!q) {
      toast.error("Digite a pergunta");
      return;
    }
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { error } = await supabase
        .from("approver_questions" as any)
        .insert({
          solicitation_id: solicitationId,
          approver_id: user.id,
          question: q,
        });
      if (error) throw error;

      const { data: approverName } = await (supabase.rpc as any)(
        "get_approver_display_name",
        { _user_id: user.id },
      );

      // Notifica o Richard por e-mail (best effort)
      try {
        const { error: emailError } = await supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "approver-question",
            recipientEmail: "richard@makergrupo.com.br",
            idempotencyKey: `approver-question-${solicitationId}-${Date.now()}`,
            templateData: {
              approverName: (approverName as string) || user.user_metadata?.full_name || "Aprovador",
              requesterName: requesterName || "",
              requestType: requestType || "",
              question: q,
              solicitationId,
            },
          },
        });
        if (emailError) throw emailError;
      } catch (e) {
        console.warn("Falha ao notificar Richard:", e);
      }

      toast.success("Pergunta registrada. Richard foi notificado.");
      setNewQuestion("");
      await load();
      onUpdated?.();
    } catch (e) {
      console.error(e);
      toast.error("Erro ao registrar pergunta. Verifique se você está logada como aprovadora.");
    } finally {
      setSubmitting(false);
    }
  };

  const submitAnswer = async (id: string) => {
    const ans = (answerDrafts[id] || "").trim();
    if (!ans) {
      toast.error("Digite a resposta");
      return;
    }
    setAnswering(id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { error } = await supabase
        .from("approver_questions" as any)
        .update({
          answer: ans,
          answered_by: user.id,
          answered_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
      toast.success("Resposta enviada");
      setAnswerDrafts((s) => ({ ...s, [id]: "" }));
      await load();
      onUpdated?.();
    } catch (e) {
      console.error(e);
      toast.error("Erro ao enviar resposta");
    } finally {
      setAnswering(null);
    }
  };

  const pending = questions.filter((q) => !q.answer).length;

  if (loading) return null;
  if (questions.length === 0 && !canAsk) return null;

  return (
    <Card className={pending > 0 ? "border-yellow-400 bg-yellow-50/40" : ""}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <MessageCircleQuestion className="h-4 w-4" />
          Perguntas dos Aprovadores
          {pending > 0 && (
            <Badge className="bg-yellow-500 text-black">{pending} pendente(s)</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {questions.map((q) => (
          <div key={q.id} className="p-3 rounded-lg border bg-background space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-sm font-medium flex items-center gap-2">
                <HelpCircle className="h-3.5 w-3.5 text-yellow-600" />
                {q.approver_name} pergunta:
              </span>
              <span className="text-xs text-muted-foreground">
                {format(new Date(q.created_at), "dd/MM HH:mm", { locale: ptBR })}
              </span>
            </div>
            <p className="text-sm italic whitespace-pre-wrap">"{q.question}"</p>

            {q.answer ? (
              <div className="pl-3 border-l-2 border-green-500 mt-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                  <span>
                    {q.answered_by_name || "Admin"} respondeu em{" "}
                    {q.answered_at &&
                      format(new Date(q.answered_at), "dd/MM HH:mm", {
                        locale: ptBR,
                      })}
                  </span>
                </div>
                <p className="text-sm mt-1 whitespace-pre-wrap">{q.answer}</p>
              </div>
            ) : canAnswer ? (
              <div className="space-y-2 pt-1">
                <Textarea
                  placeholder="Escreva a resposta..."
                  value={answerDrafts[q.id] || ""}
                  onChange={(e) =>
                    setAnswerDrafts((s) => ({ ...s, [q.id]: e.target.value }))
                  }
                  rows={2}
                />
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={() => submitAnswer(q.id)}
                    disabled={answering === q.id}
                  >
                    {answering === q.id && (
                      <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                    )}
                    Responder
                  </Button>
                </div>
              </div>
            ) : (
              <Badge variant="outline" className="text-yellow-700 border-yellow-500">
                Aguardando resposta
              </Badge>
            )}
          </div>
        ))}

        {canAsk && (
          <div className="pt-2 border-t space-y-2">
            <label className="text-sm font-medium">
              Pedir esclarecimento (sem rejeitar)
            </label>
            <Textarea
              placeholder="Ex.: por que a diferença entre os orçamentos? há alguma justificativa técnica?"
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              rows={2}
            />
            <div className="flex justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={submitQuestion}
                disabled={submitting || !newQuestion.trim()}
              >
                {submitting && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                <MessageCircleQuestion className="h-3.5 w-3.5 mr-1" />
                Enviar pergunta
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
