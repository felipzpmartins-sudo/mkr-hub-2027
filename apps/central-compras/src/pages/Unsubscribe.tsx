import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle, Loader2, MailX } from "lucide-react";

const Unsubscribe = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "valid" | "already" | "invalid" | "success" | "error">("loading");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      return;
    }

    const validateToken = async () => {
      try {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
        const response = await fetch(
          `${supabaseUrl}/functions/v1/handle-email-unsubscribe?token=${token}`,
          { headers: { apikey: anonKey } }
        );
        const data = await response.json();

        if (data.valid === true) setStatus("valid");
        else if (data.reason === "already_unsubscribed") setStatus("already");
        else setStatus("invalid");
      } catch {
        setStatus("invalid");
      }
    };

    validateToken();
  }, [token]);

  const handleUnsubscribe = async () => {
    if (!token) return;
    setProcessing(true);
    try {
      const { data } = await supabase.functions.invoke("handle-email-unsubscribe", {
        body: { token },
      });
      if (data?.success) setStatus("success");
      else if (data?.reason === "already_unsubscribed") setStatus("already");
      else setStatus("error");
    } catch {
      setStatus("error");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <MailX className="h-6 w-6" />
            Cancelar Inscrição
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {status === "loading" && (
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Verificando...
            </div>
          )}
          {status === "valid" && (
            <>
              <p className="text-muted-foreground">
                Deseja cancelar o recebimento de e-mails de notificação?
              </p>
              <Button onClick={handleUnsubscribe} disabled={processing} variant="destructive">
                {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Confirmar Cancelamento
              </Button>
            </>
          )}
          {status === "success" && (
            <div className="flex flex-col items-center gap-2 text-green-600">
              <CheckCircle className="h-8 w-8" />
              <p>Inscrição cancelada com sucesso.</p>
            </div>
          )}
          {status === "already" && (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <CheckCircle className="h-8 w-8" />
              <p>Você já cancelou sua inscrição anteriormente.</p>
            </div>
          )}
          {status === "invalid" && (
            <div className="flex flex-col items-center gap-2 text-destructive">
              <XCircle className="h-8 w-8" />
              <p>Token inválido ou expirado.</p>
            </div>
          )}
          {status === "error" && (
            <div className="flex flex-col items-center gap-2 text-destructive">
              <XCircle className="h-8 w-8" />
              <p>Erro ao processar. Tente novamente.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Unsubscribe;
