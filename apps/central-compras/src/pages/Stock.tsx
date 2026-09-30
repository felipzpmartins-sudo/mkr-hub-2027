import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, Warehouse, PackageCheck, Undo2, History, FileText, Download, AlertTriangle, ExternalLink, Upload, Printer } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatDateOnly, todayLocalISO } from "@/lib/utils";
import pdfMarkingGuide from "@/assets/pdf-marking-guide.jpg";
import { printRequisition } from "@/lib/printRequisition";

interface Req {
  id: string;
  created_at: string;
  requester_name: string;
  usage_purpose: string | null;
  requesting_sector: string | null;
  requisition_date: string | null;
  return_deadline: string | null;
  items_list: any;
  stock_status: string | null;
  picked_up_by: string | null;
  picked_up_at: string | null;
  allocation_location: string | null;
  allocation_location_other: string | null;
  approver_observation: string | null;
  delivered_at: string | null;
  delivered_to_type: string | null;
  delivered_to_name: string | null;
  returned_at: string | null;
  returned_received_by: string | null;
  returned_condition: string | null;
  returned_notes: string | null;
  missing_items_note?: string | null;
  missing_items_reported_at?: string | null;
  missing_items_reported_by?: string | null;
  requester_signature_name?: string | null;
  requester_signature_data?: string | null;
  responsibility_accepted?: boolean | null;
  contact_number?: string | null;
  contact_email?: string | null;
}

interface LogEntry {
  id: string;
  solicitation_id: string;
  action: string;
  performed_by_name: string | null;
  details: any;
  created_at: string;
}

const LOCATIONS = ["Showroom", "Pedagógico", "Comercial", "Marketing", "Outro"];

const Stock = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>("");
  const [userName, setUserName] = useState("");
  const [items, setItems] = useState<Req[]>([]);
  const [attachmentsBySolic, setAttachmentsBySolic] = useState<Record<string, { id: string; file_name: string; file_path: string }[]>>({});
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Delivery dialog
  const [deliverTarget, setDeliverTarget] = useState<Req | null>(null);
  const [pickedBy, setPickedBy] = useState("");
  const [pickupDate, setPickupDate] = useState(todayLocalISO());
  const [pickupTime, setPickupTime] = useState(format(new Date(), "HH:mm"));
  const [deliverToType, setDeliverToType] = useState<"self" | "other">("self");
  const [deliverToName, setDeliverToName] = useState("");
  const [location, setLocation] = useState("");
  const [locationOther, setLocationOther] = useState("");

  // Return dialog
  const [returnTarget, setReturnTarget] = useState<Req | null>(null);
  const [returnDate, setReturnDate] = useState(todayLocalISO());
  const [returnTime, setReturnTime] = useState(format(new Date(), "HH:mm"));
  const [returnReceiver, setReturnReceiver] = useState("");
  const [returnCondition, setReturnCondition] = useState("Bom estado");
  const [returnNotes, setReturnNotes] = useState("");

  // Missing items dialog
  const [missingTarget, setMissingTarget] = useState<Req | null>(null);
  const [missingNote, setMissingNote] = useState("");
  const [missingFile, setMissingFile] = useState<File | null>(null);

  const [saving, setSaving] = useState(false);

  const openMissing = (r: Req) => {
    setMissingTarget(r);
    setMissingNote("");
    setMissingFile(null);
  };

  const saveMissing = async () => {
    if (!missingTarget) return;
    if (!missingNote.trim()) { toast.error("Descreva quais peças estão faltando."); return; }
    if (!missingFile) { toast.error("Anexe o PDF marcado com as peças faltantes."); return; }
    setSaving(true);
    try {
      const ext = missingFile.name.split(".").pop() || "pdf";
      const path = `${missingTarget.id}/missing_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("solicitation-attachments")
        .upload(path, missingFile);
      if (upErr) throw upErr;

      const { error: attErr } = await supabase.from("attachments").insert({
        solicitation_id: missingTarget.id,
        file_path: path,
        file_name: missingFile.name,
        file_type: missingFile.type || "application/pdf",
        attachment_type: "missing_items_marked",
        uploaded_by: userId,
      });
      if (attErr) throw attErr;

      const { error: solErr } = await supabase
        .from("solicitations")
        .update({
          missing_items_note: missingNote.trim(),
          missing_items_reported_at: new Date().toISOString(),
          missing_items_reported_by: userName,
        })
        .eq("id", missingTarget.id);
      if (solErr) throw solErr;

      await logActivity(missingTarget.id, "missing_items", {
        note: missingNote.trim(),
        file: missingFile.name,
      });

      toast.success("Peças faltantes reportadas ao solicitante!");
      setMissingTarget(null);
      await load();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Erro ao reportar peças faltantes");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth"); return; }
      setUserId(session.user.id);

      const { data: roles } = await supabase
        .from("user_roles").select("role").eq("user_id", session.user.id);
      let allowed = roles?.some((r: any) =>
        ["stock", "admin", "super_admin", "requisition_approver"].includes(r.role)
      ) || false;

      if (!allowed) {
        toast.error("Acesso restrito ao Estoque.");
        navigate("/");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles").select("full_name").eq("user_id", session.user.id).maybeSingle();
      setUserName(profile?.full_name || session.user.email || "");
      await load();
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const load = async () => {
    setLoading(true);
    const [{ data, error }, { data: logData }] = await Promise.all([
      supabase
        .from("solicitations")
        .select("*")
        .eq("request_type", "internal_requisition")
        .in("approval_status", ["approved_released", "approved_partial", "delivered"])
        .order("released_at", { ascending: false }),
      supabase
        .from("stock_activity_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500),
    ]);
    if (error) {
      console.error(error);
      toast.error("Erro ao carregar dados");
    } else {
      const list = (data as any) || [];
      setItems(list);
      const ids = list.map((r: any) => r.id);
      if (ids.length > 0) {
        const { data: atts } = await supabase
          .from("attachments")
          .select("id, file_name, file_path, solicitation_id")
          .in("solicitation_id", ids);
        const grouped: Record<string, any[]> = {};
        (atts || []).forEach((a: any) => {
          (grouped[a.solicitation_id] ||= []).push(a);
        });
        setAttachmentsBySolic(grouped);
      } else {
        setAttachmentsBySolic({});
      }
    }
    setLogs((logData as any) || []);
    setLoading(false);
  };

  const downloadAttachment = async (att: { file_name: string; file_path: string }) => {
    try {
      const { data, error } = await supabase.storage
        .from("solicitation-attachments")
        .download(att.file_path);
      if (error) throw error;
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = att.file_name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      console.error(e);
      toast.error("Erro ao baixar arquivo");
    }
  };

  const logActivity = async (solicitationId: string, action: string, details: any) => {
    await supabase.from("stock_activity_log").insert({
      solicitation_id: solicitationId,
      action,
      performed_by: userId,
      performed_by_name: userName,
      details,
    });
  };

  // ----- Delivery -----
  const openDeliver = (r: Req) => {
    setDeliverTarget(r);
    setPickedBy("");
    setPickupDate(todayLocalISO());
    setPickupTime(format(new Date(), "HH:mm"));
    setDeliverToType("self");
    setDeliverToName("");
    setLocation("");
    setLocationOther("");
  };

  const saveDelivery = async () => {
    if (!deliverTarget) return;
    const recipientName = deliverToType === "self"
      ? deliverTarget.requester_name
      : deliverToName.trim();
    if (deliverToType === "other" && !recipientName) {
      toast.error("Informe o nome de quem recebeu."); return;
    }
    if (!pickedBy.trim()) { toast.error("Informe quem retirou."); return; }
    setSaving(true);
    try {
      const deliveredAt = new Date(`${pickupDate}T${pickupTime}:00`).toISOString();
      const { error } = await supabase
        .from("solicitations")
        .update({
          stock_status: "picked_up",
          picked_up_by: pickedBy.trim(),
          picked_up_at: deliveredAt,
          delivered_at: deliveredAt,
          delivered_to_type: deliverToType,
          delivered_to_name: recipientName,
          status: "delivered",
        })
        .eq("id", deliverTarget.id);
      if (error) throw error;
      await logActivity(deliverTarget.id, "delivered", {
        requester: deliverTarget.requester_name,
        picked_up_by: pickedBy.trim(),
        delivered_to_type: deliverToType,
        delivered_to_name: recipientName,
        delivered_at: deliveredAt,
      });
      toast.success("Entrega registrada!");
      setDeliverTarget(null);
      await load();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  // ----- Return -----
  const openReturn = (r: Req) => {
    setReturnTarget(r);
    setReturnDate(todayLocalISO());
    setReturnTime(format(new Date(), "HH:mm"));
    setReturnReceiver(userName);
    setReturnCondition("Bom estado");
    setReturnNotes("");
  };

  const saveReturn = async () => {
    if (!returnTarget) return;
    if (!returnReceiver.trim()) { toast.error("Informe quem recebeu a devolução."); return; }
    setSaving(true);
    try {
      const returnedAt = new Date(`${returnDate}T${returnTime}:00`).toISOString();
      const { error } = await supabase
        .from("solicitations")
        .update({
          stock_status: "returned",
          returned_at: returnedAt,
          returned_received_by: returnReceiver.trim(),
          returned_condition: returnCondition,
          returned_notes: returnNotes.trim() || null,
        })
        .eq("id", returnTarget.id);
      if (error) throw error;
      await logActivity(returnTarget.id, "returned", {
        requester: returnTarget.requester_name,
        returned_at: returnedAt,
        received_by: returnReceiver.trim(),
        condition: returnCondition,
        notes: returnNotes.trim() || null,
      });
      toast.success("Devolução registrada!");
      setReturnTarget(null);
      await load();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const pending = items.filter((i) => !i.stock_status || ["pending_pickup", "separating", "ready_pickup"].includes(i.stock_status));
  const delivered = items.filter((i) => i.stock_status === "picked_up");
  const returned = items.filter((i) => i.stock_status === "returned");

  const updateStage = async (r: Req, stage: "separating" | "ready_pickup") => {
    try {
      const { error } = await supabase
        .from("solicitations")
        .update({ stock_status: stage })
        .eq("id", r.id);
      if (error) throw error;
      await logActivity(r.id, stage === "separating" ? "separation_started" : "ready_for_pickup", {
        requester: r.requester_name,
      });
      if (stage === "ready_pickup") {
        try {
          const itemsList = Array.isArray(r.items_list) ? r.items_list : [];
          const itemsSummary = itemsList
            .map((it: any) => `${it.quantity ? it.quantity + "x " : ""}${it.name || it.product_name || "Item"}`)
            .join(", ");
          const allocationLocation = r.allocation_location === "Outro"
            ? r.allocation_location_other
            : r.allocation_location;
          const recipients = new Set<string>();
          if ((r as any).requester_email) recipients.add((r as any).requester_email);
          if (r.contact_email) recipients.add(r.contact_email);
          await Promise.all(
            Array.from(recipients).map((email) =>
              supabase.functions.invoke("send-transactional-email", {
                body: {
                  recipientEmail: email,
                  templateName: "stock-pieces-status",
                  templateData: {
                    requesterName: r.requester_name,
                    itemsSummary,
                    allocationLocation,
                    stage: "ready_pickup",
                    solicitationId: r.id,
                  },
                  idempotencyKey: `stock-ready-pickup-${r.id}-${email}`,
                },
              })
            )
          );
        } catch (e) { console.error("Falha ao notificar solicitante:", e); }
        toast.success("Solicitante notificado: peças prontas para retirada!");
      } else {
        toast.success("Separação iniciada.");
      }
      await load();
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Erro ao atualizar status");
    }
  };

  const signOut = async () => { await supabase.auth.signOut(); navigate("/auth"); };

  const fmtDT = (s: string | null) =>
    s ? format(new Date(s), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : "—";

  const renderCard = (r: Req, kind: "pending" | "delivered" | "returned") => {
    const itemsList = Array.isArray(r.items_list) ? r.items_list : [];
    return (
      <Card key={r.id}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle className="text-base">{r.requester_name}</CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Setor: {r.requesting_sector || "—"}
              </p>
            </div>
            {kind === "pending" && r.stock_status === "ready_pickup" && <Badge className="bg-emerald-600">Pronto para retirada</Badge>}
            {kind === "pending" && r.stock_status === "separating" && <Badge className="bg-amber-500">Separando peças</Badge>}
            {kind === "pending" && (!r.stock_status || r.stock_status === "pending_pickup") && <Badge variant="outline">Aguardando entrega</Badge>}
            {kind === "delivered" && <Badge className="bg-blue-600">Entregue</Badge>}
            {kind === "returned" && <Badge className="bg-green-600">Devolvido</Badge>}
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {r.usage_purpose && (
            <div>
              <p className="text-muted-foreground text-xs">Finalidade</p>
              <p>{r.usage_purpose}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-muted-foreground text-xs">Data da solicitação</p>
              <p>{formatDateOnly(r.requisition_date || r.created_at)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Prazo de devolução</p>
              <p>{formatDateOnly(r.return_deadline)}</p>
            </div>
            {r.allocation_location && (
              <div className="col-span-2">
                <p className="text-muted-foreground text-xs">Local de alocação</p>
                <p>{r.allocation_location === "Outro" ? r.allocation_location_other : r.allocation_location}</p>
              </div>
            )}
          </div>
          <div>
            <p className="text-muted-foreground text-xs mb-1">Itens</p>
            <ul className="space-y-1">
              {itemsList.map((it: any, i: number) => (
                <li key={i} className="border rounded px-2 py-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{it.name || it.product_name || "Item"}</span>
                    {it.quantity ? <span className="text-muted-foreground text-xs">Qtd: {it.quantity}</span> : null}
                  </div>
                  {it.observations && (
                    <p className="text-xs text-muted-foreground mt-1">{it.observations}</p>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {(attachmentsBySolic[r.id]?.length ?? 0) > 0 && (
            <div>
              <p className="text-muted-foreground text-xs mb-1">Anexos</p>
              <ul className="space-y-1">
                {attachmentsBySolic[r.id].map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-2 border rounded px-2 py-1">
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-xs truncate">{a.file_name}</span>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => downloadAttachment(a)}>
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(kind === "delivered" || kind === "returned") && (
            <div className="rounded bg-muted/40 p-2 text-xs space-y-1">
              <p><strong>Entregue em:</strong> {fmtDT(r.delivered_at || r.picked_up_at)}</p>
              <p><strong>Recebido por:</strong> {r.delivered_to_name || r.picked_up_by}{" "}
                {r.delivered_to_type === "other" && <span className="text-muted-foreground">(terceiro)</span>}
              </p>
              <p><strong>Local:</strong> {r.allocation_location === "Outro" ? r.allocation_location_other : r.allocation_location}</p>
            </div>
          )}

          {kind === "returned" && (
            <div className="rounded bg-green-50 dark:bg-green-950/30 p-2 text-xs space-y-1">
              <p><strong>Devolvido em:</strong> {fmtDT(r.returned_at)}</p>
              <p><strong>Recebido por:</strong> {r.returned_received_by}</p>
              <p><strong>Condição:</strong> {r.returned_condition}</p>
              {r.returned_notes && <p><strong>Obs:</strong> {r.returned_notes}</p>}
            </div>
          )}

          {r.missing_items_note && (
            <div className="rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-2 text-xs space-y-1">
              <p className="flex items-center gap-1 font-semibold text-amber-800 dark:text-amber-300">
                <AlertTriangle className="h-3.5 w-3.5" /> Peças faltantes reportadas
              </p>
              <p className="text-amber-900 dark:text-amber-200">{r.missing_items_note}</p>
              {r.missing_items_reported_at && (
                <p className="text-muted-foreground">
                  Reportado por {r.missing_items_reported_by || "estoque"} em {fmtDT(r.missing_items_reported_at)}
                </p>
              )}
            </div>
          )}

          {kind === "pending" && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={r.stock_status === "separating" ? "default" : "outline"}
                  onClick={() => updateStage(r, "separating")}
                  disabled={r.stock_status === "separating" || r.stock_status === "ready_pickup"}
                >
                  <PackageCheck className="h-4 w-4 mr-2" /> Começar separação
                </Button>
                <Button
                  className={r.stock_status === "ready_pickup" ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                  variant={r.stock_status === "ready_pickup" ? "default" : "outline"}
                  onClick={() => updateStage(r, "ready_pickup")}
                  disabled={r.stock_status === "ready_pickup"}
                >
                  <PackageCheck className="h-4 w-4 mr-2" /> Pronto para retirada
                </Button>
              </div>
              <Button className="w-full" onClick={() => openDeliver(r)}>
                <PackageCheck className="h-4 w-4 mr-2" /> Registrar Entrega
              </Button>
              <Button className="w-full" variant="outline" onClick={() => printRequisition(r as any)}>
                <Printer className="h-4 w-4 mr-2" /> Imprimir termo + assinatura
              </Button>
              <Button className="w-full" variant="outline" onClick={() => openMissing(r)}>
                <AlertTriangle className="h-4 w-4 mr-2" /> Reportar peça faltante
              </Button>
            </div>
          )}
          {kind === "delivered" && (
            <div className="space-y-2">
              <Button className="w-full" variant="secondary" onClick={() => openReturn(r)}>
                <Undo2 className="h-4 w-4 mr-2" /> Registrar Devolução
              </Button>
              <Button className="w-full" variant="outline" onClick={() => printRequisition(r as any)}>
                <Printer className="h-4 w-4 mr-2" /> Imprimir termo + assinatura
              </Button>
            </div>
          )}
          {kind === "returned" && (
            <Button className="w-full" variant="outline" onClick={() => printRequisition(r as any)}>
              <Printer className="h-4 w-4 mr-2" /> Imprimir termo + assinatura
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Warehouse className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-xl font-bold">Estoque — Requisições Internas</h1>
              <p className="text-xs text-muted-foreground">{userName}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" /> Sair
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <StockTutorial />
        <Tabs defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">A entregar ({pending.length})</TabsTrigger>
            <TabsTrigger value="delivered">Entregues ({delivered.length})</TabsTrigger>
            <TabsTrigger value="returned">Devolvidos ({returned.length})</TabsTrigger>
            <TabsTrigger value="log"><History className="h-3.5 w-3.5 mr-1" /> Registro</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="mt-4">
            {loading ? <p className="text-muted-foreground text-center py-12">Carregando...</p>
              : pending.length === 0 ? (
                <Card><CardContent className="py-12 text-center text-muted-foreground">
                  Nenhuma requisição aguardando entrega.
                </CardContent></Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pending.map((r) => renderCard(r, "pending"))}
                </div>
              )}
          </TabsContent>

          <TabsContent value="delivered" className="mt-4">
            {delivered.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">
                Nenhuma entrega ativa.
              </CardContent></Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {delivered.map((r) => renderCard(r, "delivered"))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="returned" className="mt-4">
            {returned.length === 0 ? (
              <Card><CardContent className="py-12 text-center text-muted-foreground">
                Nenhuma devolução registrada ainda.
              </CardContent></Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {returned.map((r) => renderCard(r, "returned"))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="log" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Registro de atividades</CardTitle></CardHeader>
              <CardContent>
                {logs.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Nenhuma atividade registrada.</p>
                ) : (
                  <ul className="space-y-2">
                    {logs.map((l) => {
                      const d = l.details || {};
                      const label = l.action === "delivered" ? "Entrega" : l.action === "returned" ? "Devolução" : "Nota";
                      const badge =
                        l.action === "delivered" ? "bg-blue-600" :
                        l.action === "returned" ? "bg-green-600" : "bg-muted";
                      return (
                        <li key={l.id} className="border rounded p-3 text-sm">
                          <div className="flex items-center justify-between mb-1">
                            <Badge className={badge}>{label}</Badge>
                            <span className="text-xs text-muted-foreground">{fmtDT(l.created_at)}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">Por: {l.performed_by_name || "—"}</p>
                          {d.requester && <p><strong>Solicitante:</strong> {d.requester}</p>}
                          {l.action === "delivered" && (
                            <>
                              <p><strong>Entregue para:</strong> {d.delivered_to_name} {d.delivered_to_type === "other" && "(terceiro)"}</p>
                              <p><strong>Retirado por:</strong> {d.picked_up_by}</p>
                              <p><strong>Local:</strong> {d.location}</p>
                            </>
                          )}
                          {l.action === "returned" && (
                            <>
                              <p><strong>Recebido por:</strong> {d.received_by}</p>
                              <p><strong>Condição:</strong> {d.condition}</p>
                              {d.notes && <p><strong>Obs:</strong> {d.notes}</p>}
                            </>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Delivery dialog */}
      <Dialog open={!!deliverTarget} onOpenChange={(o) => !o && setDeliverTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Entrega</DialogTitle>
            <DialogDescription>
              Solicitante: <strong>{deliverTarget?.requester_name}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Data *</Label>
                <Input type="date" value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} />
              </div>
              <div>
                <Label>Horário *</Label>
                <Input type="time" value={pickupTime} onChange={(e) => setPickupTime(e.target.value)} />
              </div>
            </div>

            <div>
              <Label>Entregue para *</Label>
              <RadioGroup value={deliverToType} onValueChange={(v) => setDeliverToType(v as any)} className="flex gap-4 mt-2">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="self" id="self" />
                  <Label htmlFor="self" className="font-normal cursor-pointer">
                    Próprio solicitante ({deliverTarget?.requester_name})
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="other" id="other" />
                  <Label htmlFor="other" className="font-normal cursor-pointer">Outra pessoa</Label>
                </div>
              </RadioGroup>
              {deliverToType === "other" && (
                <Input className="mt-2" placeholder="Nome de quem recebeu"
                  value={deliverToName} onChange={(e) => setDeliverToName(e.target.value)} />
              )}
            </div>

            <div>
              <Label>Responsável do estoque que entregou *</Label>
              <Input value={pickedBy} onChange={(e) => setPickedBy(e.target.value)} placeholder="Seu nome" />
            </div>

            {deliverTarget && (deliverTarget as any).allocation_location && (
              <div className="rounded bg-muted/40 p-2 text-xs">
                <strong>Local de alocação:</strong>{" "}
                {(deliverTarget as any).allocation_location === "Outro"
                  ? (deliverTarget as any).allocation_location_other
                  : (deliverTarget as any).allocation_location}{" "}
                <span className="text-muted-foreground">(definido pelo solicitante)</span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeliverTarget(null)} disabled={saving}>Cancelar</Button>
            <Button onClick={saveDelivery} disabled={saving}>
              {saving ? "Salvando..." : "Confirmar Entrega"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Return dialog */}
      <Dialog open={!!returnTarget} onOpenChange={(o) => !o && setReturnTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Devolução</DialogTitle>
            <DialogDescription>
              Solicitante: <strong>{returnTarget?.requester_name}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Data *</Label>
                <Input type="date" value={returnDate} onChange={(e) => setReturnDate(e.target.value)} />
              </div>
              <div>
                <Label>Horário *</Label>
                <Input type="time" value={returnTime} onChange={(e) => setReturnTime(e.target.value)} />
              </div>
            </div>

            <div>
              <Label>Recebido por (estoque) *</Label>
              <Input value={returnReceiver} onChange={(e) => setReturnReceiver(e.target.value)} />
            </div>

            <div>
              <Label>Condição do material *</Label>
              <Select value={returnCondition} onValueChange={setReturnCondition}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Bom estado">Bom estado</SelectItem>
                  <SelectItem value="Com avarias">Com avarias</SelectItem>
                  <SelectItem value="Incompleto">Incompleto</SelectItem>
                  <SelectItem value="Danificado">Danificado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Observações</Label>
              <Textarea value={returnNotes} onChange={(e) => setReturnNotes(e.target.value)}
                placeholder="Detalhes opcionais sobre a devolução" />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnTarget(null)} disabled={saving}>Cancelar</Button>
            <Button onClick={saveReturn} disabled={saving}>
              {saving ? "Salvando..." : "Confirmar Devolução"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Missing items dialog */}
      <Dialog open={!!missingTarget} onOpenChange={(o) => !o && setMissingTarget(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Reportar peça faltante
            </DialogTitle>
            <DialogDescription>
              Solicitante: <strong>{missingTarget?.requester_name}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-3 text-sm space-y-2">
              <p className="font-semibold text-amber-900 dark:text-amber-200">Como reportar as peças faltantes:</p>
              <ol className="list-decimal pl-5 space-y-1 text-amber-900 dark:text-amber-200 text-xs">
                <li>Baixe o PDF anexado à requisição.</li>
                <li>Abra o editor de PDF pelo botão abaixo.</li>
                <li>
                  Use a ferramenta <strong>Desenhar</strong> e marque com um <strong>X</strong> as peças
                  que não temos em estoque (veja o guia visual).
                </li>
                <li>Salve o PDF editado e anexe aqui, junto com a justificativa.</li>
              </ol>
              <div className="mt-2 rounded-md overflow-hidden border border-amber-300 bg-white">
                <img
                  src={pdfMarkingGuide}
                  alt="Guia visual: como marcar peças faltantes no PDF com um X"
                  loading="lazy"
                  width={1024}
                  height={768}
                  className="w-full h-auto"
                />
                <p className="text-[11px] text-center text-amber-900 py-1 bg-amber-50">
                  Exemplo: marque com um <strong>X</strong> sobre a peça faltante
                </p>
              </div>
              <Button
                asChild
                variant="secondary"
                size="sm"
                className="w-full mt-2"
              >
                <a
                  href="https://files-editor.com/pt-BR/upload"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4 mr-2" /> Abrir editor de PDF
                </a>
              </Button>
            </div>

            <div>
              <Label>Justificativa / peças faltantes *</Label>
              <Textarea
                value={missingNote}
                onChange={(e) => setMissingNote(e.target.value)}
                placeholder="Ex.: Não temos as peças X, Y e Z. Marcamos no PDF anexo."
                rows={4}
              />
            </div>

            <div>
              <Label>PDF marcado *</Label>
              <Input
                type="file"
                accept="application/pdf,.pdf"
                onChange={(e) => setMissingFile(e.target.files?.[0] || null)}
              />
              {missingFile && (
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <FileText className="h-3 w-3" /> {missingFile.name}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setMissingTarget(null)} disabled={saving}>Cancelar</Button>
            <Button onClick={saveMissing} disabled={saving}>
              <Upload className="h-4 w-4 mr-2" />
              {saving ? "Enviando..." : "Enviar ao solicitante"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

const StockTutorial = () => {
  const KEY = "stock_tutorial_dismissed_v2";
  const [open, setOpen] = useState<boolean>(() => {
    try { return localStorage.getItem(KEY) !== "1"; } catch { return true; }
  });
  if (!open) {
    return (
      <div className="mb-4 flex justify-end">
        <Button variant="ghost" size="sm" onClick={() => { localStorage.removeItem(KEY); setOpen(true); }}>
          <FileText className="h-4 w-4 mr-2" /> Ver guia de uso
        </Button>
      </div>
    );
  }
  const dismiss = () => { try { localStorage.setItem(KEY, "1"); } catch {} setOpen(false); };
  const steps = [
    { n: 1, title: "Baixar o PDF e separar as peças", desc: "Faça o download do PDF anexado à requisição e separe fisicamente as peças listadas." },
    { n: 2, title: 'Clicar em "Começar separação"', desc: 'Ao iniciar a separação, clique em "Começar separação" para notificar o solicitante de que as peças já estão sendo separadas.' },
    { n: 3, title: "Reportar peça faltante (se necessário)", desc: 'Se alguma peça não estiver disponível, clique em "Reportar peça faltante", marque com um X no PDF e reenvie ao solicitante pelo sistema.' },
    { n: 4, title: 'Marcar "Pronto para retirada"', desc: 'Quando terminar a separação, clique em "Pronto para retirada" — o solicitante recebe um e-mail avisando que pode buscar.' },
    { n: 5, title: "Imprimir termo + assinatura", desc: 'Clique em "Imprimir termo + assinatura" para gerar a folha com o termo de responsabilidade e a assinatura digital.' },
    { n: 6, title: "Registrar a entrega", desc: "No momento da retirada, colha a assinatura física na folha impressa e clique em \"Registrar entrega\" para confirmar no sistema." },
  ];
  return (
    <Card className="mb-4 border-primary/40 bg-primary/5">
      <CardHeader className="pb-2 flex flex-row items-start justify-between">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <Warehouse className="h-4 w-4 text-primary" /> Guia rápido — como usar esta tela
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">Siga os passos abaixo em cada requisição. Você pode ocultar este guia quando quiser.</p>
        </div>
        <Button variant="ghost" size="sm" onClick={dismiss}>Ocultar</Button>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <div key={s.n} className="rounded-lg border bg-background p-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">{s.n}</div>
                <div className="font-semibold text-sm">{s.title}</div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default Stock;
