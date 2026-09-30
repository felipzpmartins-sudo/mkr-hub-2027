import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Upload, DollarSign, MessageSquare, X, Paperclip } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface QuoteInput {
  productLink: string;
  storeName: string;
  value: string;
  comment: string;
  file: File | null;
}

interface ProductGroup {
  name: string;
  existingCount: number;
  quotes: QuoteInput[];
}

interface ProductItem {
  name: string;
  quantity?: number;
}

interface QuotesUploadProps {
  solicitationId: string;
  onSuccess: () => void;
  existingCount: number;
  isAdmin?: boolean;
  requestType?: string;
  productItems?: ProductItem[]; // Lista de produtos para orçamentos por produto
  existingByProduct?: Record<string, number>; // Contagem de orçamentos existentes por produto
}

const emptyQuote = (): QuoteInput => ({ productLink: "", storeName: "", value: "", comment: "", file: null });

export const QuotesUpload = ({
  solicitationId,
  onSuccess,
  existingCount,
  isAdmin = false,
  requestType,
  productItems,
  existingByProduct,
}: QuotesUploadProps) => {
  // Determinar se é modo multi-produto (mais de 1 item)
  const isMultiProduct = !!productItems && productItems.length > 1;

  // Inicializar grupos
  const initialGroups: ProductGroup[] = isMultiProduct
    ? productItems!.map((p) => {
        const already = existingByProduct?.[p.name] ?? 0;
        const remaining = Math.max(0, 3 - already);
        return {
          name: p.name,
          existingCount: already,
          quotes: Array.from({ length: remaining }, () => emptyQuote()),
        };
      })
    : [
        {
          name: productItems?.[0]?.name ?? "",
          existingCount,
          quotes: Array.from({ length: Math.max(0, 3 - existingCount) }, () => emptyQuote()),
        },
      ];

  const [groups, setGroups] = useState<ProductGroup[]>(initialGroups);
  const [uploading, setUploading] = useState(false);

  const updateQuote = (groupIdx: number, quoteIdx: number, field: keyof QuoteInput, value: unknown) => {
    setGroups((prev) => {
      const next = [...prev];
      const g = { ...next[groupIdx] };
      const qs = [...g.quotes];
      qs[quoteIdx] = { ...qs[quoteIdx], [field]: value } as QuoteInput;
      g.quotes = qs;
      next[groupIdx] = g;
      return next;
    });
  };

  const handleFileChange = (groupIdx: number, quoteIdx: number, files: FileList | null) => {
    if (files && files.length > 0) updateQuote(groupIdx, quoteIdx, "file", files[0]);
  };

  const removeFile = (groupIdx: number, quoteIdx: number) => updateQuote(groupIdx, quoteIdx, "file", null);

  const handleUpload = async () => {
    // Coletar orçamentos válidos por grupo
    const toInsert: { productName: string | null; quote: QuoteInput }[] = [];
    groups.forEach((g) => {
      g.quotes.forEach((q) => {
        if (q.productLink.trim() || q.file || q.value.trim() || q.storeName.trim()) {
          toInsert.push({ productName: g.name || null, quote: q });
        }
      });
    });

    if (toInsert.length === 0) {
      toast.error("Adicione pelo menos 1 orçamento com valor, link ou arquivo");
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      for (const { productName, quote } of toInsert) {
        let filePath = quote.productLink.trim() || "Sem link";
        let fileName = "Link";

        if (quote.file) {
          const fileExt = quote.file.name.split(".").pop();
          const uniqueFileName = `${solicitationId}/quote_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
          const { error: uploadError } = await supabase.storage
            .from("solicitation-attachments")
            .upload(uniqueFileName, quote.file);
          if (uploadError) throw uploadError;
          filePath = uniqueFileName;
          fileName = quote.file.name;
        }

        const { error: insertError } = await supabase.from("quotes").insert({
          solicitation_id: solicitationId,
          file_path: filePath,
          file_name: fileName,
          supplier_name: quote.comment.trim() || null,
          store_name: quote.storeName.trim() || null,
          value: quote.value ? parseFloat(quote.value.replace(",", ".")) : null,
          uploaded_by: user.id,
          product_name: productName,
        });
        if (insertError) throw insertError;
      }

      const { data: solicitation } = await supabase
        .from("solicitations")
        .select("requester_name, request_type")
        .eq("id", solicitationId)
        .single();

      const approverEmails = [
        "controller@makergrupo.com.br",
        "ceo@makergrupo.com.br",
        "financeiro2@makergrupo.com.br",
        "financeiro@makergrupo.com.br",
      ];

      for (const email of approverEmails) {
        await supabase.functions.invoke("send-transactional-email", {
          body: {
            templateName: "approval-notification",
            recipientEmail: email,
            idempotencyKey: `approval-notify-${solicitationId}-${email}-${Date.now()}`,
            templateData: {
              requesterName: solicitation?.requester_name || "Não informado",
              requestType: solicitation?.request_type || "Não informado",
              solicitationId,
            },
          },
        });
      }

      supabase.functions
        .invoke("notify-whatsapp", {
          body: {
            solicitationId,
            requesterName: solicitation?.requester_name || "Não informado",
            requestType: solicitation?.request_type || "product",
            event: "approval_ready",
          },
        })
        .catch((e) => console.error("notify-whatsapp:", e));

      toast.success("Orçamentos enviados com sucesso!");
      onSuccess();

    } catch (error) {
      console.error("Erro ao enviar orçamentos:", error);
      toast.error("Erro ao enviar orçamentos");
    } finally {
      setUploading(false);
    }
  };

  // Se tudo está preenchido (nada pra enviar)
  const totalSlots = groups.reduce((acc, g) => acc + g.quotes.length, 0);

  if (totalSlots <= 0) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="pt-4">
          <p className="text-green-700 text-center flex items-center justify-center gap-2">
            <FileText className="h-5 w-5" />
            Todos os orçamentos já foram anexados (máximo atingido).
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!isAdmin) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="pt-4">
          <p className="text-amber-700 text-center flex items-center justify-center gap-2">
            <FileText className="h-5 w-5" />
            Aguardando orçamentos — o administrador irá pesquisar e anexar os orçamentos.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Upload className="h-4 w-4" />
          Anexar Orçamentos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-sm text-muted-foreground">
          {isMultiProduct
            ? "Anexe até 3 orçamentos para cada produto da solicitação."
            : "Anexe pelo menos 1 orçamento. Você pode incluir até 3, se necessário."}
        </p>

        {groups.map((group, groupIdx) => (
          <div key={groupIdx} className="space-y-3">
            {isMultiProduct && (
              <div className="flex items-center gap-2 pb-2 border-b">
                <FileText className="h-4 w-4 text-primary" />
                <h4 className="font-semibold text-sm">
                  Produto: {group.name || `Item ${groupIdx + 1}`}
                </h4>
                <span className="text-xs text-muted-foreground">
                  ({group.existingCount} de 3 já anexado{group.existingCount === 1 ? "" : "s"})
                </span>
              </div>
            )}

            {group.quotes.map((quote, index) => (
              <div key={index} className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">
                    Orçamento {group.existingCount + index + 1}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor={`store-${groupIdx}-${index}`} className="flex items-center gap-1">
                      Nome da Loja / Fornecedor
                    </Label>
                    <Input
                      id={`store-${groupIdx}-${index}`}
                      placeholder="Ex: Loja do Zé, Amazon..."
                      value={quote.storeName}
                      onChange={(e) => updateQuote(groupIdx, index, "storeName", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`value-${groupIdx}-${index}`} className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      Valor (R$)
                    </Label>
                    <Input
                      id={`value-${groupIdx}-${index}`}
                      placeholder="0,00"
                      value={quote.value}
                      onChange={(e) => updateQuote(groupIdx, index, "value", e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`link-${groupIdx}-${index}`} className="flex items-center gap-1">
                    {requestType === "accommodation"
                      ? "Link da Casa/Hotel (opcional)"
                      : "Link do Produto (opcional)"}
                  </Label>
                  <Input
                    id={`link-${groupIdx}-${index}`}
                    placeholder="https://..."
                    value={quote.productLink}
                    onChange={(e) => updateQuote(groupIdx, index, "productLink", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    <Paperclip className="h-3 w-3" />
                    Anexar Arquivo (opcional)
                  </Label>
                  {quote.file ? (
                    <div className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm truncate">{quote.file.name}</span>
                        <span className="text-xs text-muted-foreground flex-shrink-0">
                          ({(quote.file.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeFile(groupIdx, index)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                        onChange={(e) => handleFileChange(groupIdx, index, e.target.files)}
                        className="hidden"
                        id={`file-${groupIdx}-${index}`}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById(`file-${groupIdx}-${index}`)?.click()}
                        className="w-full"
                      >
                        <Paperclip className="h-4 w-4 mr-2" />
                        Selecionar Arquivo
                      </Button>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`comment-${groupIdx}-${index}`} className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    Comentário (opcional)
                  </Label>
                  <Textarea
                    id={`comment-${groupIdx}-${index}`}
                    placeholder="Observações sobre este orçamento..."
                    value={quote.comment}
                    onChange={(e) => updateQuote(groupIdx, index, "comment", e.target.value)}
                    rows={2}
                  />
                </div>
              </div>
            ))}
          </div>
        ))}

        <Button onClick={handleUpload} disabled={uploading} className="w-full">
          {uploading ? "Enviando..." : "Enviar Orçamentos"}
        </Button>
      </CardContent>
    </Card>
  );
};
