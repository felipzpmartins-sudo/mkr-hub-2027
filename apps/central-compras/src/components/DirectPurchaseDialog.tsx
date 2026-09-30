import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Zap } from "lucide-react";
import { todayLocalISO } from "@/lib/utils";

interface DirectPurchaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function DirectPurchaseDialog({ open, onOpenChange, onSuccess }: DirectPurchaseDialogProps) {
  const [item, setItem] = useState("");
  const [supplier, setSupplier] = useState("");
  const [value, setValue] = useState("");
  const [justification, setJustification] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(todayLocalISO());
  const [finalStatus, setFinalStatus] = useState<"purchasing" | "delivered">("purchasing");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setItem("");
    setSupplier("");
    setValue("");
    setJustification("");
    setPurchaseDate(todayLocalISO());
    setFinalStatus("purchasing");
  };

  const handleSubmit = async () => {
    if (!item.trim() || !supplier.trim() || !value.trim() || !justification.trim() || !purchaseDate) {
      toast.error("Preencha todos os campos obrigatórios.");
      return;
    }
    const numericValue = parseFloat(value.replace(",", "."));
    if (isNaN(numericValue) || numericValue <= 0) {
      toast.error("Informe um valor válido.");
      return;
    }

    setSubmitting(true);
    try {
      let { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        await supabase.auth.refreshSession();
        ({ data: { session } } = await supabase.auth.getSession());
      }
      const user = session?.user;
      if (!user) {
        toast.error("Sua sessão expirou. Faça login novamente.");
        setTimeout(() => { window.location.href = "/auth"; }, 1200);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("user_id", user.id)
        .single();

      const insertData: any = {
        user_id: user.id,
        requester_name: profile?.full_name || "Compra Direta",
        requester_phone: profile?.phone || "—",
        requester_email: user.email,
        request_type: "product",
        product_name: item.trim(),
        product_quantity: 1,
        product_observations: justification.trim(),
        status: finalStatus,
        approval_status: finalStatus === "delivered" ? "delivered" : "approved_released",
        approved_count: 2,
        released_at: new Date().toISOString(),
        is_urgent: true,
        urgency_justification: justification.trim(),
        is_direct_purchase: true,
        direct_purchase_supplier: supplier.trim(),
        direct_purchase_value: numericValue,
        direct_purchase_date: purchaseDate,
        actual_delivery_date: finalStatus === "delivered" ? purchaseDate : null,
      };

      const { data: inserted, error } = await supabase
        .from("solicitations")
        .insert(insertData)
        .select("id")
        .single();
      if (error) throw error;

      await supabase.from("status_history").insert({
        solicitation_id: inserted.id,
        old_status: null,
        new_status: `direct_purchase_${finalStatus}`,
        changed_by: user.id,
        justification: `Compra direta lançada. Fornecedor: ${supplier.trim()} · Valor: R$ ${numericValue.toFixed(2)} · Motivo: ${justification.trim()}`,
      });

      toast.success("Compra direta registrada com sucesso.");
      reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Erro ao registrar compra direta.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!submitting) onOpenChange(o); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-destructive" />
            Lançar Compra Direta (Emergência)
          </DialogTitle>
          <DialogDescription>
            Registre uma compra feita diretamente, sem fluxo de aprovação. Apenas para controle.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="dp-item">Item / Descrição *</Label>
            <Input id="dp-item" value={item} onChange={(e) => setItem(e.target.value)} placeholder="Ex: Lâmpada LED 9W" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="dp-supplier">Fornecedor *</Label>
              <Input id="dp-supplier" value={supplier} onChange={(e) => setSupplier(e.target.value)} placeholder="Ex: Leroy Merlin" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dp-value">Valor (R$) *</Label>
              <Input id="dp-value" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} placeholder="0,00" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dp-date">Data da compra *</Label>
            <Input id="dp-date" type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dp-just">Justificativa da urgência *</Label>
            <Textarea id="dp-just" value={justification} onChange={(e) => setJustification(e.target.value)} rows={3} placeholder="Ex: Lâmpada queimada no escritório, troca imediata." />
          </div>

          <div className="space-y-2">
            <Label>Status do lançamento *</Label>
            <RadioGroup value={finalStatus} onValueChange={(v) => setFinalStatus(v as any)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="purchasing" id="dp-st-buy" />
                <Label htmlFor="dp-st-buy" className="font-normal cursor-pointer">Em Compra (ainda não chegou)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="delivered" id="dp-st-del" />
                <Label htmlFor="dp-st-del" className="font-normal cursor-pointer">Entregue (já recebida)</Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={submitting} variant="destructive">
            {submitting ? "Registrando..." : "Registrar Compra"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
