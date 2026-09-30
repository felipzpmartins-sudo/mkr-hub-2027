import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileUploadInput } from "./FileUploadInput";
import { SignaturePad } from "./SignaturePad";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, AlertTriangle } from "lucide-react";
import { todayLocalISO } from "@/lib/utils";

interface NewRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  defaultUrgent?: boolean;
}

type RequestType = "product" | "flight" | "personalized_material" | "accommodation" | "apostilas" | "internal_requisition" | "cleaning_product";
type MaterialType = "sticker" | "banner" | "folder" | "flyer" | "other";

interface InternalRequisitionItem {
  name: string;
  quantity: string;
  observations: string;
}


interface ApostilaItem {
  name: string;
  quantity: string;
}

interface ProductItem {
  name: string;
  quantity: string;
  link: string;
  observations: string;
  files: File[];
}

interface AccommodationGuest {
  name: string;
  cpf: string;
  birthDate: string;
}

export const NewRequestDialog = ({ open, onOpenChange, onSuccess, defaultUrgent = false }: NewRequestDialogProps) => {
  const [loading, setLoading] = useState(false);
  const [requestType, setRequestType] = useState<RequestType>("product");
  const [isUrgent, setIsUrgent] = useState(false);
  const [urgencyJustification, setUrgencyJustification] = useState("");
  
  // Dados pessoais
  const [requesterName, setRequesterName] = useState("");
  const [requesterPhone, setRequesterPhone] = useState("");
  const [requesterEmail, setRequesterEmail] = useState("");
  
  // Produto (múltiplos itens)
  const [productItems, setProductItems] = useState<ProductItem[]>([
    { name: "", quantity: "", link: "", observations: "", files: [] }
  ]);
  
  // Passagem
  const [flightOrigin, setFlightOrigin] = useState("");
  const [flightDestination, setFlightDestination] = useState("");
  const [flightDepartureDate, setFlightDepartureDate] = useState("");
  const [flightReturnDate, setFlightReturnDate] = useState("");
  const [flightTime, setFlightTime] = useState("");
  const [flightAirline, setFlightAirline] = useState("");
  const [flightValue, setFlightValue] = useState("");
  const [flightSearchLink, setFlightSearchLink] = useState("");
  const [flightObservations, setFlightObservations] = useState("");
  const [flightFiles, setFlightFiles] = useState<File[]>([]);
  
  // Material personalizado
  const [materialType, setMaterialType] = useState<MaterialType>("sticker");
  const [materialTypeOther, setMaterialTypeOther] = useState("");
  const [materialSize, setMaterialSize] = useState("");
  const [materialQuantity, setMaterialQuantity] = useState("");
  const [materialPurpose, setMaterialPurpose] = useState("");
  const [materialObservations, setMaterialObservations] = useState("");
  const [materialArtFiles, setMaterialArtFiles] = useState<File[]>([]);
  const [materialRefFiles, setMaterialRefFiles] = useState<File[]>([]);

  // Hospedagem
  const [accommodationRequesterCpf, setAccommodationRequesterCpf] = useState("");
  const [accommodationRequesterBirthDate, setAccommodationRequesterBirthDate] = useState("");
  const [accommodationDestinationCity, setAccommodationDestinationCity] = useState("");
  const [accommodationDestinationState, setAccommodationDestinationState] = useState("");
  const [accommodationGuestsCount, setAccommodationGuestsCount] = useState("");
  const [accommodationGuests, setAccommodationGuests] = useState<AccommodationGuest[]>([]);
  const [accommodationCheckIn, setAccommodationCheckIn] = useState("");
  const [accommodationCheckOut, setAccommodationCheckOut] = useState("");
  const [accommodationTravelReason, setAccommodationTravelReason] = useState("");
  const [accommodationEventAddress, setAccommodationEventAddress] = useState("");

  // Apostilas
  const [apostilasItems, setApostilasItems] = useState<ApostilaItem[]>([{ name: "", quantity: "" }]);
  const [apostilasObservations, setApostilasObservations] = useState("");

  // Produtos de Limpeza
  const [cleaningItems, setCleaningItems] = useState<ApostilaItem[]>([{ name: "", quantity: "" }]);
  const [cleaningObservations, setCleaningObservations] = useState("");

  // Requisição Interna
  const today = todayLocalISO();
  const [reqDate, setReqDate] = useState(today);
  const [returnDeadline, setReturnDeadline] = useState("");
  const [usagePurpose, setUsagePurpose] = useState("");
  const [requestingSector, setRequestingSector] = useState("");
  const [allocationLocation, setAllocationLocation] = useState("");
  const [allocationLocationOther, setAllocationLocationOther] = useState("");
  const [internalItems, setInternalItems] = useState<InternalRequisitionItem[]>([{ name: "", quantity: "", observations: "" }]);
  const [responsibilityAccepted, setResponsibilityAccepted] = useState(false);
  const [signatureName, setSignatureName] = useState("");
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [partsPackages, setPartsPackages] = useState<{ name: string; file: File | null }[]>([]);
  const [internalMode, setInternalMode] = useState<"manual" | "parts_package">("manual");



  // Load user profile data when dialog opens
  useEffect(() => {
    if (open) {
      loadUserProfile();
      setIsUrgent(defaultUrgent);
      setUrgencyJustification("");
    }
  }, [open, defaultUrgent]);

  const loadUserProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, phone')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (profile) {
        setRequesterName(profile.full_name || "");
        setRequesterPhone(profile.phone || "");
      }

      // Also set email from auth
      setRequesterEmail(session.user.email || "");
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
    }
  };

  const resetForm = () => {
    
    setProductItems([{ name: "", quantity: "", link: "", observations: "", files: [] }]);
    setFlightOrigin("");
    setFlightDestination("");
    setFlightDepartureDate("");
    setFlightReturnDate("");
    setFlightTime("");
    setFlightAirline("");
    setFlightValue("");
    setFlightSearchLink("");
    setFlightObservations("");
    setFlightFiles([]);
    setMaterialType("sticker");
    setMaterialTypeOther("");
    setMaterialSize("");
    setMaterialQuantity("");
    setMaterialPurpose("");
    setMaterialObservations("");
    setMaterialArtFiles([]);
    setMaterialRefFiles([]);
    // Hospedagem
    setAccommodationRequesterCpf("");
    setAccommodationRequesterBirthDate("");
    setAccommodationDestinationCity("");
    setAccommodationDestinationState("");
    setAccommodationGuestsCount("");
    setAccommodationGuests([]);
    setAccommodationCheckIn("");
    setAccommodationCheckOut("");
    setAccommodationTravelReason("");
    setAccommodationEventAddress("");
    // Apostilas
    setApostilasItems([{ name: "", quantity: "" }]);
    setApostilasObservations("");
    // Requisição Interna
    setReqDate(today);
    setReturnDeadline("");
    setUsagePurpose("");
    setRequestingSector("");
    setInternalItems([{ name: "", quantity: "", observations: "" }]);
    setResponsibilityAccepted(false);
    setSignatureName("");
    setSignatureData(null);
    setPartsPackages([]);
  };

  const handleGuestsCountChange = (value: string) => {
    const count = parseInt(value) || 0;
    setAccommodationGuestsCount(value);
    
    // Ajusta o array de hóspedes
    if (count > accommodationGuests.length) {
      const newGuests = [...accommodationGuests];
      for (let i = accommodationGuests.length; i < count; i++) {
        newGuests.push({ name: "", cpf: "", birthDate: "" });
      }
      setAccommodationGuests(newGuests);
    } else if (count < accommodationGuests.length) {
      setAccommodationGuests(accommodationGuests.slice(0, count));
    }
  };

  const updateGuest = (index: number, field: keyof AccommodationGuest, value: string) => {
    const newGuests = [...accommodationGuests];
    newGuests[index] = { ...newGuests[index], [field]: value };
    setAccommodationGuests(newGuests);
  };

  const addGuest = () => {
    setAccommodationGuests([...accommodationGuests, { name: "", cpf: "", birthDate: "" }]);
    setAccommodationGuestsCount(String(accommodationGuests.length + 1));
  };

  const removeGuest = (index: number) => {
    const newGuests = accommodationGuests.filter((_, i) => i !== index);
    setAccommodationGuests(newGuests);
    setAccommodationGuestsCount(String(newGuests.length));
  };

  const uploadFile = async (file: File, solicitationId: string, attachmentType: string, userId: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${solicitationId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError, data } = await supabase.storage
      .from('solicitation-attachments')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    await supabase.from('attachments').insert({
      solicitation_id: solicitationId,
      uploaded_by: userId,
      attachment_type: attachmentType,
      file_name: file.name,
      file_path: filePath,
      file_type: file.type,
    });

    return data;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Get current user
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Você precisa estar logado para criar uma solicitação");
        return;
      }

      // Validar dados pessoais
      if (!requesterName.trim()) {
        toast.error("Informe seu nome completo");
        return;
      }
      if (!requesterPhone.trim()) {
        toast.error("Informe seu telefone");
        return;
      }
      if (isUrgent && !urgencyJustification.trim()) {
        toast.error("Justifique o motivo da urgência");
        return;
      }

      // Preparar dados conforme tipo
      const baseData: any = {
        user_id: session.user.id,
        requester_name: requesterName,
        requester_email: requesterEmail || null,
        requester_phone: requesterPhone,
        request_type: requestType,
        is_urgent: isUrgent,
        urgency_justification: isUrgent ? urgencyJustification.trim() : null,
      };

      let specificData = {};
      let filesToUpload: Array<{ file: File; type: string }> = [];

      if (requestType === "product") {
        const incompleteProduct = productItems.find(item => {
          const hasAnyValue = item.name.trim() || item.quantity.trim() || item.link.trim() || item.observations.trim() || item.files.length > 0;
          return hasAnyValue && (!item.name.trim() || !item.quantity.trim());
        });
        if (incompleteProduct) {
          toast.error("Preencha o nome e a quantidade de todos os produtos adicionados");
          return;
        }
        const validProducts = productItems.filter(item => item.name.trim() && item.quantity.trim());
        if (validProducts.length === 0) {
          toast.error("Adicione pelo menos um produto com nome e quantidade");
          return;
        }
        // First item goes to legacy fields for backward compat
        specificData = {
          product_name: validProducts[0].name,
          product_quantity: parseInt(validProducts[0].quantity),
          product_link: validProducts[0].link || null,
          product_observations: validProducts[0].observations || null,
          items_list: validProducts.map(item => ({
            name: item.name,
            quantity: parseInt(item.quantity),
            link: item.link || null,
            observations: item.observations || null,
          })),
        };
        filesToUpload = validProducts.flatMap(item => item.files.map(f => ({ file: f, type: 'product_image' })));
      } else if (requestType === "flight") {
        if (!flightOrigin || !flightDestination || !flightDepartureDate) {
          toast.error("Preencha origem, destino e data de ida");
          return;
        }
        specificData = {
          flight_origin: flightOrigin,
          flight_destination: flightDestination,
          flight_departure_date: flightDepartureDate,
          flight_return_date: flightReturnDate || null,
          flight_time: flightTime || null,
          flight_preferred_airline: flightAirline || null,
          flight_estimated_value: flightValue || null,
          flight_search_link: flightSearchLink || null,
          flight_observations: flightObservations || null,
        };
        filesToUpload = flightFiles.map(f => ({ file: f, type: 'flight_screenshot' }));
      } else if (requestType === "personalized_material") {
        if (!materialQuantity) {
          toast.error("Preencha a quantidade do material");
          return;
        }
        specificData = {
          material_type: materialType,
          material_type_other: materialType === 'other' ? materialTypeOther : null,
          material_size: materialSize || null,
          material_quantity: parseInt(materialQuantity),
          material_purpose: materialPurpose || null,
          material_observations: materialObservations || null,
        };
        filesToUpload = [
          ...materialArtFiles.map(f => ({ file: f, type: 'material_art' })),
          ...materialRefFiles.map(f => ({ file: f, type: 'material_reference' })),
        ];
      } else if (requestType === "accommodation") {
        if (!accommodationRequesterCpf || !accommodationRequesterBirthDate) {
          toast.error("Preencha o CPF e data de nascimento do solicitante");
          return;
        }
        if (!accommodationDestinationCity || !accommodationDestinationState) {
          toast.error("Preencha a cidade e estado de destino");
          return;
        }
        if (!accommodationCheckIn || !accommodationCheckOut) {
          toast.error("Preencha as datas de check-in e check-out");
          return;
        }
        if (accommodationGuests.length === 0) {
          toast.error("Adicione pelo menos uma pessoa para hospedagem");
          return;
        }
        const invalidGuest = accommodationGuests.find(g => !g.name || !g.cpf || !g.birthDate);
        if (invalidGuest) {
          toast.error("Preencha todos os dados de todos os hóspedes");
          return;
        }
        specificData = {
          accommodation_requester_cpf: accommodationRequesterCpf,
          accommodation_requester_birth_date: accommodationRequesterBirthDate,
          accommodation_destination_city: accommodationDestinationCity,
          accommodation_destination_state: accommodationDestinationState,
          accommodation_guests_count: accommodationGuests.length,
          accommodation_guests_data: accommodationGuests,
          accommodation_check_in: accommodationCheckIn,
          accommodation_check_out: accommodationCheckOut,
          accommodation_travel_reason: accommodationTravelReason || null,
          accommodation_event_address: accommodationEventAddress || null,
        };
      } else if (requestType === "apostilas") {
        const validItems = apostilasItems.filter(item => item.name.trim() && item.quantity.trim());
        if (validItems.length === 0) {
          toast.error("Adicione pelo menos um item com nome e quantidade");
          return;
        }
        specificData = {
          items_list: validItems.map(item => ({ name: item.name, quantity: parseInt(item.quantity) })),
          product_observations: apostilasObservations || null,
        };
      } else if (requestType === "cleaning_product") {
        const validItems = cleaningItems.filter(item => item.name.trim() && item.quantity.trim());
        if (validItems.length === 0) {
          toast.error("Adicione pelo menos um produto de limpeza com nome e quantidade");
          return;
        }
        specificData = {
          items_list: validItems.map(item => ({ name: item.name, quantity: parseInt(item.quantity) })),
          product_observations: cleaningObservations || null,
        };
      } else if (requestType === "internal_requisition") {
        if (!returnDeadline) {
          toast.error("Informe o prazo para devolução");
          return;
        }
        if (!usagePurpose.trim()) {
          toast.error("Informe a finalidade de uso");
          return;
        }
        if (!requestingSector.trim()) {
          toast.error("Informe o setor solicitante");
          return;
        }
        if (!allocationLocation) {
          toast.error("Selecione o local de alocação");
          return;
        }
        if (allocationLocation === "Outro" && !allocationLocationOther.trim()) {
          toast.error("Especifique o local de alocação");
          return;
        }
        let validInternal: typeof internalItems = [];
        const validPackages = partsPackages.filter(p => p.file && p.name.trim());
        if (internalMode === "manual") {
          validInternal = internalItems.filter(i => i.name.trim() && i.quantity.trim());
          if (validInternal.length === 0) {
            toast.error("Adicione pelo menos um produto com nome e quantidade");
            return;
          }
        } else {
          if (validPackages.length === 0) {
            toast.error("Adicione ao menos um pacote de peças com nome e PDF");
            return;
          }
        }
        if (!responsibilityAccepted) {
          toast.error("É necessário aceitar o termo de responsabilidade");
          return;
        }
        if (!signatureName.trim()) {
          toast.error("Informe seu nome completo para assinatura");
          return;
        }
        if (!signatureData) {
          toast.error("Desenhe sua assinatura no campo indicado");
          return;
        }
        specificData = {
          requisition_date: reqDate,
          return_deadline: returnDeadline,
          usage_purpose: usagePurpose.trim(),
          requesting_sector: requestingSector.trim(),
          allocation_location: allocationLocation,
          allocation_location_other: allocationLocation === "Outro" ? allocationLocationOther.trim() : null,
          items_list: internalMode === "manual"
            ? validInternal.map(i => ({
                name: i.name.trim(),
                quantity: parseInt(i.quantity),
                observations: i.observations || null,
              }))
            : validPackages.map(p => ({
                name: p.name.trim(),
                quantity: 1,
                observations: "Pacote de peças (PDF anexo)",
              })),
          responsibility_accepted: true,
          requester_signature_name: signatureName.trim(),
          requester_signature_data: signatureData,
          // Pula etapa de orçamentos — vai direto para aprovação dos 2 aprovadores
          approval_status: 'pending_approval',
        };
        filesToUpload = validPackages
          .map(p => ({ file: p.file as File, type: `parts_package:${p.name.trim()}` }));
      }

      const { data: solicitation, error: insertError } = await supabase
        .from('solicitations')
        .insert({ ...baseData, ...specificData })
        .select()
        .single();

      if (insertError) throw insertError;

      // Upload de arquivos
      for (const { file, type } of filesToUpload) {
        await uploadFile(file, solicitation.id, type, session.user.id);
      }

      toast.success("Solicitação criada com sucesso!");

      // Aviso no WhatsApp dos aprovadores (não bloqueia o fluxo)
      supabase.functions.invoke('notify-whatsapp', {
        body: {
          solicitationId: solicitation.id,
          requesterName,
          requestType,
          isUrgent,
        },
      }).then(({ error: notifyError }) => {
        if (notifyError) console.error('Falha ao enviar aviso WhatsApp:', notifyError);
      }).catch((e) => console.error('Falha ao enviar aviso WhatsApp:', e));

      // Aviso por e-mail para o Richard (não bloqueia o fluxo)
      supabase.functions.invoke('send-transactional-email', {
        body: {
          templateName: 'new-request-notification',
          recipientEmail: 'compras@mkr.makergrupo.com.br',
          idempotencyKey: `new-request-${solicitation.id}`,
          templateData: {
            requesterName,
            requestType,
            isUrgent,
            solicitationId: solicitation.id,
          },
        },
      }).catch((e) => console.error('Falha ao enviar e-mail de nova solicitação:', e));

      resetForm();
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao criar solicitação:', error);
      const message = error instanceof Error ? error.message : "Não foi possível enviar o pedido";
      toast.error(`Erro ao criar solicitação: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90dvh] w-[calc(100%-2rem)] max-w-3xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 px-6 pb-4 pt-6">
          <DialogTitle className="flex items-center gap-2">
            Nova Solicitação
            {isUrgent && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-destructive text-destructive-foreground">
                <AlertTriangle className="h-3 w-3" /> URGENTE
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            Preencha os dados da sua solicitação de compra
          </DialogDescription>
        </DialogHeader>

        <form noValidate onSubmit={handleSubmit} className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-6 pb-6 touch-pan-y">
          {/* Marcação de Urgência */}
          <div className={`p-4 rounded-lg border-2 ${isUrgent ? "border-destructive bg-destructive/5" : "border-dashed border-muted-foreground/30"}`}>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isUrgent}
                onChange={(e) => setIsUrgent(e.target.checked)}
                className="mt-1 h-4 w-4 accent-destructive"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 font-semibold">
                  <AlertTriangle className={`h-4 w-4 ${isUrgent ? "text-destructive" : "text-muted-foreground"}`} />
                  Marcar como Compra de Urgência
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Solicitações urgentes serão destacadas para aprovadores e administradores, mas seguem o mesmo fluxo de aprovação.
                </p>
              </div>
            </label>
            {isUrgent && (
              <div className="mt-3">
                <Label htmlFor="urgencyJustification">Justificativa da urgência *</Label>
                <Textarea
                  id="urgencyJustification"
                  value={urgencyJustification}
                  onChange={(e) => setUrgencyJustification(e.target.value)}
                  placeholder="Explique por que esta solicitação é urgente..."
                  required={isUrgent}
                  rows={3}
                  maxLength={1000}
                />
              </div>
            )}
          </div>

          {/* Dados Pessoais */}
          <div className="space-y-4 p-4 bg-secondary/50 rounded-lg">
            <h3 className="font-semibold">Seus Dados</h3>
            <div>
              <Label htmlFor="requesterName">Nome Completo *</Label>
              <Input
                id="requesterName"
                value={requesterName}
                onChange={(e) => setRequesterName(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="requesterPhone">Telefone *</Label>
                <Input
                  id="requesterPhone"
                  type="tel"
                  value={requesterPhone}
                  onChange={(e) => setRequesterPhone(e.target.value)}
                  placeholder="(11) 98765-4321"
                  required
                />
              </div>
              <div>
                <Label htmlFor="requesterEmail">E-mail (opcional)</Label>
                <Input
                  id="requesterEmail"
                  type="email"
                  value={requesterEmail}
                  onChange={(e) => setRequesterEmail(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Dados Gerais */}
          <div className="space-y-4 p-4 bg-secondary/50 rounded-lg">
            <h3 className="font-semibold">Dados da Solicitação</h3>
            <div>
              <Label htmlFor="requestType">Tipo de Solicitação *</Label>
              <Select value={requestType} onValueChange={(v) => setRequestType(v as RequestType)}>
                <SelectTrigger className="select-none">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent className="z-[100] bg-popover" sideOffset={4}>
                  <SelectItem value="product">Produto</SelectItem>
                  <SelectItem value="flight">Passagem Aérea</SelectItem>
                  <SelectItem value="personalized_material">Material Personalizado</SelectItem>
                  <SelectItem value="accommodation">Reserva de Hospedagem</SelectItem>
                  <SelectItem value="apostilas">Apostilas</SelectItem>
                  <SelectItem value="cleaning_product">Produto de Limpeza</SelectItem>
                  <SelectItem value="internal_requisition">Requisição de Produtos Internos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Bloco PRODUTO (múltiplos itens) */}
          {requestType === "product" && (
            <div className="space-y-4">
              {productItems.map((item, index) => (
                <div key={index} className="space-y-4 p-4 bg-secondary/50 rounded-lg relative">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Produto {productItems.length > 1 ? `#${index + 1}` : ""}</h3>
                    {productItems.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setProductItems(productItems.filter((_, i) => i !== index))}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Remover
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Nome do Produto *</Label>
                      <Input
                        value={item.name}
                        onChange={(e) => {
                          const updated = [...productItems];
                          updated[index] = { ...updated[index], name: e.target.value };
                          setProductItems(updated);
                        }}
                        required
                      />
                    </div>
                    <div>
                      <Label>Quantidade *</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => {
                          const updated = [...productItems];
                          updated[index] = { ...updated[index], quantity: e.target.value };
                          setProductItems(updated);
                        }}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Link do Produto</Label>
                    <Input
                      type="url"
                      value={item.link}
                      onChange={(e) => {
                        const updated = [...productItems];
                        updated[index] = { ...updated[index], link: e.target.value };
                        setProductItems(updated);
                      }}
                      placeholder="https://..."
                    />
                  </div>
                  <div>
                    <Label>Observações</Label>
                    <Textarea
                      value={item.observations}
                      onChange={(e) => {
                        const updated = [...productItems];
                        updated[index] = { ...updated[index], observations: e.target.value };
                        setProductItems(updated);
                      }}
                      rows={2}
                    />
                  </div>
                  <FileUploadInput
                    label="Foto ou Print do Produto"
                    accept="image/*,.pdf"
                    multiple
                    value={item.files}
                    onChange={(files) => {
                      const updated = [...productItems];
                      updated[index] = { ...updated[index], files };
                      setProductItems(updated);
                    }}
                    helperText="Aceita imagens (JPG, PNG) e PDF"
                  />
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={() => setProductItems([...productItems, { name: "", quantity: "", link: "", observations: "", files: [] }])}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Produto
              </Button>
            </div>
          )}

          {/* Bloco PASSAGEM */}
          {requestType === "flight" && (
            <div className="space-y-4 p-4 bg-secondary/50 rounded-lg">
              <h3 className="font-semibold">Dados da Passagem</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="flightOrigin">Origem *</Label>
                  <Input
                    id="flightOrigin"
                    value={flightOrigin}
                    onChange={(e) => setFlightOrigin(e.target.value)}
                    placeholder="Cidade/Estado"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="flightDestination">Destino *</Label>
                  <Input
                    id="flightDestination"
                    value={flightDestination}
                    onChange={(e) => setFlightDestination(e.target.value)}
                    placeholder="Cidade/Estado"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="flightDepartureDate">Data de Ida *</Label>
                  <Input
                    id="flightDepartureDate"
                    type="date"
                    value={flightDepartureDate}
                    onChange={(e) => setFlightDepartureDate(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="flightReturnDate">Data de Volta</Label>
                  <Input
                    id="flightReturnDate"
                    type="date"
                    value={flightReturnDate}
                    onChange={(e) => setFlightReturnDate(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="flightTime">Horário Desejado</Label>
                <Input
                  id="flightTime"
                  value={flightTime}
                  onChange={(e) => setFlightTime(e.target.value)}
                  placeholder="Ex: Manhã, Tarde, Noite"
                />
              </div>
              <div>
                <Label htmlFor="flightObservations">Observações</Label>
                <Textarea
                  id="flightObservations"
                  value={flightObservations}
                  onChange={(e) => setFlightObservations(e.target.value)}
                  rows={3}
                />
              </div>
              <FileUploadInput
                label="Print do Voo Pesquisado"
                accept="image/*,.pdf"
                multiple
                value={flightFiles}
                onChange={setFlightFiles}
                helperText="Print de sites, tickets, orçamentos"
              />
            </div>
          )}

          {/* Bloco HOSPEDAGEM */}
          {requestType === "accommodation" && (
            <div className="space-y-6">
              {/* Dados do Solicitante (responsável) */}
              <div className="space-y-4 p-4 bg-secondary/50 rounded-lg">
                <h3 className="font-semibold">Dados do Solicitante (Responsável pela Reserva)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="accommodationRequesterCpf">CPF *</Label>
                    <Input
                      id="accommodationRequesterCpf"
                      value={accommodationRequesterCpf}
                      onChange={(e) => setAccommodationRequesterCpf(e.target.value)}
                      placeholder="000.000.000-00"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="accommodationRequesterBirthDate">Data de Nascimento *</Label>
                    <Input
                      id="accommodationRequesterBirthDate"
                      type="date"
                      value={accommodationRequesterBirthDate}
                      onChange={(e) => setAccommodationRequesterBirthDate(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Destino da Viagem */}
              <div className="space-y-4 p-4 bg-secondary/50 rounded-lg">
                <h3 className="font-semibold">Destino da Viagem</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="accommodationDestinationCity">Cidade *</Label>
                    <Input
                      id="accommodationDestinationCity"
                      value={accommodationDestinationCity}
                      onChange={(e) => setAccommodationDestinationCity(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="accommodationDestinationState">Estado *</Label>
                    <Input
                      id="accommodationDestinationState"
                      value={accommodationDestinationState}
                      onChange={(e) => setAccommodationDestinationState(e.target.value)}
                      placeholder="Ex: SP, RJ, MG"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Datas da Viagem */}
              <div className="space-y-4 p-4 bg-secondary/50 rounded-lg">
                <h3 className="font-semibold">Datas da Viagem</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="accommodationCheckIn">Data de Check-in (Ida) *</Label>
                    <Input
                      id="accommodationCheckIn"
                      type="date"
                      value={accommodationCheckIn}
                      onChange={(e) => setAccommodationCheckIn(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="accommodationCheckOut">Data de Check-out (Retorno) *</Label>
                    <Input
                      id="accommodationCheckOut"
                      type="date"
                      value={accommodationCheckOut}
                      onChange={(e) => setAccommodationCheckOut(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Hóspedes */}
              <div className="space-y-4 p-4 bg-secondary/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Pessoas que Irão se Hospedar</h3>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addGuest}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar Pessoa
                  </Button>
                </div>
                
                {accommodationGuests.length === 0 && (
                  <p className="text-muted-foreground text-sm">
                    Clique em "Adicionar Pessoa" para incluir os hóspedes
                  </p>
                )}

                {accommodationGuests.map((guest, index) => (
                  <div key={index} className="p-3 border rounded-lg space-y-3 bg-background">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Pessoa {index + 1}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeGuest(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <Label>Nome Completo *</Label>
                        <Input
                          value={guest.name}
                          onChange={(e) => updateGuest(index, 'name', e.target.value)}
                          placeholder="Nome completo"
                        />
                      </div>
                      <div>
                        <Label>CPF *</Label>
                        <Input
                          value={guest.cpf}
                          onChange={(e) => updateGuest(index, 'cpf', e.target.value)}
                          placeholder="000.000.000-00"
                        />
                      </div>
                      <div>
                        <Label>Data de Nascimento *</Label>
                        <Input
                          type="date"
                          value={guest.birthDate}
                          onChange={(e) => updateGuest(index, 'birthDate', e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Motivo da Viagem */}
              <div className="space-y-4 p-4 bg-secondary/50 rounded-lg">
                <h3 className="font-semibold">Motivo da Viagem</h3>
                <div>
                  <Label htmlFor="accommodationTravelReason">Descreva o motivo da viagem</Label>
                  <Textarea
                    id="accommodationTravelReason"
                    value={accommodationTravelReason}
                    onChange={(e) => setAccommodationTravelReason(e.target.value)}
                    placeholder="Ex: Participação em evento, reunião com cliente, treinamento, feira..."
                    rows={3}
                  />
                </div>
              </div>

              {/* Endereço de Referência */}
              <div className="space-y-4 p-4 bg-secondary/50 rounded-lg">
                <h3 className="font-semibold">Endereço de Referência do Evento</h3>
                <p className="text-sm text-muted-foreground">
                  Informe o endereço do evento para que a hospedagem seja buscada o mais próximo possível.
                </p>
                <div>
                  <Label htmlFor="accommodationEventAddress">Endereço Completo</Label>
                  <Textarea
                    id="accommodationEventAddress"
                    value={accommodationEventAddress}
                    onChange={(e) => setAccommodationEventAddress(e.target.value)}
                    placeholder="Rua, número, bairro, CEP..."
                    rows={2}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Bloco MATERIAL PERSONALIZADO */}
          {requestType === "personalized_material" && (
            <div className="space-y-4 p-4 bg-secondary/50 rounded-lg">
              <h3 className="font-semibold">Dados do Material Personalizado</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="materialType">Tipo de Material *</Label>
                  <Select value={materialType} onValueChange={(v) => setMaterialType(v as MaterialType)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sticker">Adesivo</SelectItem>
                      <SelectItem value="banner">Banner</SelectItem>
                      <SelectItem value="folder">Folder</SelectItem>
                      <SelectItem value="flyer">Flyer</SelectItem>
                      <SelectItem value="other">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {materialType === "other" && (
                  <div>
                    <Label htmlFor="materialTypeOther">Especifique o Tipo</Label>
                    <Input
                      id="materialTypeOther"
                      value={materialTypeOther}
                      onChange={(e) => setMaterialTypeOther(e.target.value)}
                    />
                  </div>
                )}
                <div>
                  <Label htmlFor="materialQuantity">Quantidade *</Label>
                  <Input
                    id="materialQuantity"
                    type="number"
                    min="1"
                    value={materialQuantity}
                    onChange={(e) => setMaterialQuantity(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="materialPurpose">Finalidade / Evento</Label>
                <Input
                  id="materialPurpose"
                  value={materialPurpose}
                  onChange={(e) => setMaterialPurpose(e.target.value)}
                  placeholder="Para que será usado?"
                />
              </div>
              <div>
                <Label htmlFor="materialObservations">Observações</Label>
                <Textarea
                  id="materialObservations"
                  value={materialObservations}
                  onChange={(e) => setMaterialObservations(e.target.value)}
                  rows={3}
                />
              </div>
              <FileUploadInput
                label="Arte / Arquivo"
                accept="image/*,.pdf,.ai,.psd,.eps"
                multiple
                value={materialArtFiles}
                onChange={setMaterialArtFiles}
                helperText="Arquivos de design: PDF, PNG, JPG, AI, PSD, EPS"
              />
              <FileUploadInput
                label="Referências Visuais"
                accept="image/*,.pdf"
                multiple
                value={materialRefFiles}
                onChange={setMaterialRefFiles}
                helperText="Imagens de referência ou layouts anteriores"
              />
            </div>
          )}

          {/* Bloco APOSTILAS */}
          {requestType === "apostilas" && (
            <div className="space-y-4 p-4 bg-secondary/50 rounded-lg">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Lista de Apostilas</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setApostilasItems([...apostilasItems, { name: "", quantity: "" }])}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Item
                </Button>
              </div>
              
              {apostilasItems.map((item, index) => (
                <div key={index} className="flex items-end gap-3 p-3 border rounded-lg bg-background">
                  <div className="flex-1">
                    <Label>Nome da Apostila *</Label>
                    <Input
                      value={item.name}
                      onChange={(e) => {
                        const newItems = [...apostilasItems];
                        newItems[index] = { ...newItems[index], name: e.target.value };
                        setApostilasItems(newItems);
                      }}
                      placeholder="Ex: Apostila de Matemática"
                    />
                  </div>
                  <div className="w-24">
                    <Label>Qtd *</Label>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => {
                        const newItems = [...apostilasItems];
                        newItems[index] = { ...newItems[index], quantity: e.target.value };
                        setApostilasItems(newItems);
                      }}
                    />
                  </div>
                  {apostilasItems.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setApostilasItems(apostilasItems.filter((_, i) => i !== index))}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}

              <div>
                <Label htmlFor="apostilasObservations">Observações</Label>
                <Textarea
                  id="apostilasObservations"
                  value={apostilasObservations}
                  onChange={(e) => setApostilasObservations(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Bloco PRODUTOS DE LIMPEZA */}
          {requestType === "cleaning_product" && (
            <div className="space-y-4 p-4 bg-secondary/50 rounded-lg">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Lista de Produtos de Limpeza</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCleaningItems([...cleaningItems, { name: "", quantity: "" }])}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Produto
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                Informe todos os produtos e quantidades da compra do mês. A cotação será feita pelo valor total
                da lista em cada loja (3 orçamentos), e não por item.
              </p>

              {cleaningItems.map((item, index) => (
                <div key={index} className="flex items-end gap-3 p-3 border rounded-lg bg-background">
                  <div className="flex-1">
                    <Label>Nome do Produto *</Label>
                    <Input
                      value={item.name}
                      onChange={(e) => {
                        const newItems = [...cleaningItems];
                        newItems[index] = { ...newItems[index], name: e.target.value };
                        setCleaningItems(newItems);
                      }}
                      placeholder="Ex: Desinfetante"
                    />
                  </div>
                  <div className="w-24">
                    <Label>Qtd *</Label>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => {
                        const newItems = [...cleaningItems];
                        newItems[index] = { ...newItems[index], quantity: e.target.value };
                        setCleaningItems(newItems);
                      }}
                    />
                  </div>
                  {cleaningItems.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setCleaningItems(cleaningItems.filter((_, i) => i !== index))}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}

              <div>
                <Label htmlFor="cleaningObservations">Observações</Label>
                <Textarea
                  id="cleaningObservations"
                  value={cleaningObservations}
                  onChange={(e) => setCleaningObservations(e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          )}

          {/* Bloco REQUISIÇÃO INTERNA */}
          {requestType === "internal_requisition" && (
            <div className="space-y-4">
              <div className="space-y-4 p-4 bg-secondary/50 rounded-lg">
                <h3 className="font-semibold">Dados da Requisição</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="reqDate">Data da Solicitação *</Label>
                    <Input id="reqDate" type="date" value={reqDate} onChange={(e) => setReqDate(e.target.value)} required />
                  </div>
                  <div>
                    <Label htmlFor="returnDeadline">Prazo para Devolução *</Label>
                    <Input id="returnDeadline" type="date" value={returnDeadline} onChange={(e) => setReturnDeadline(e.target.value)} required />
                  </div>
                </div>
                <div>
                  <Label htmlFor="requestingSector">Setor Solicitante *</Label>
                  <Input id="requestingSector" value={requestingSector} onChange={(e) => setRequestingSector(e.target.value)} placeholder="Ex: TI, Marketing, Operações..." required />
                </div>
                <div>
                  <Label htmlFor="usagePurpose">Finalidade de Uso *</Label>
                  <Textarea id="usagePurpose" value={usagePurpose} onChange={(e) => setUsagePurpose(e.target.value)} placeholder="Para que serão utilizados os produtos requisitados..." rows={3} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="allocationLocation">Local de Alocação *</Label>
                    <Select value={allocationLocation} onValueChange={setAllocationLocation}>
                      <SelectTrigger id="allocationLocation"><SelectValue placeholder="Selecione..." /></SelectTrigger>
                      <SelectContent>
                        {["Showroom", "Pedagógico", "Comercial", "Marketing", "Outro"].map((l) => (
                          <SelectItem key={l} value={l}>{l}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {allocationLocation === "Outro" && (
                    <div>
                      <Label htmlFor="allocationLocationOther">Especifique *</Label>
                      <Input id="allocationLocationOther" value={allocationLocationOther} onChange={(e) => setAllocationLocationOther(e.target.value)} />
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3 p-4 bg-secondary/50 rounded-lg">
                <div>
                  <Label className="text-sm">Como deseja informar os itens? *</Label>
                  <div className="flex gap-2 mt-2">
                    <Button
                      type="button"
                      variant={internalMode === "manual" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setInternalMode("manual")}
                    >
                      Adicionar Manualmente
                    </Button>
                    <Button
                      type="button"
                      variant={internalMode === "parts_package" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setInternalMode("parts_package")}
                    >
                      Pacote de Peças (PDF)
                    </Button>
                  </div>
                </div>

                {internalMode === "manual" ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">Produtos Requisitados</h3>
                      <Button type="button" variant="outline" size="sm" onClick={() => setInternalItems([...internalItems, { name: "", quantity: "", observations: "" }])}>
                        <Plus className="mr-2 h-4 w-4" /> Adicionar Produto
                      </Button>
                    </div>
                    {internalItems.map((item, index) => (
                      <div key={index} className="p-3 border rounded-lg space-y-3 bg-background">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Produto {index + 1}</span>
                          {internalItems.length > 1 && (
                            <Button type="button" variant="ghost" size="sm" onClick={() => setInternalItems(internalItems.filter((_, i) => i !== index))}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="col-span-2">
                            <Label>Nome do Produto *</Label>
                            <Input value={item.name} onChange={(e) => {
                              const u = [...internalItems]; u[index] = { ...u[index], name: e.target.value }; setInternalItems(u);
                            }} />
                          </div>
                          <div>
                            <Label>Quantidade *</Label>
                            <Input type="number" min="1" value={item.quantity} onChange={(e) => {
                              const u = [...internalItems]; u[index] = { ...u[index], quantity: e.target.value }; setInternalItems(u);
                            }} />
                          </div>
                        </div>
                        <div>
                          <Label>Observações</Label>
                          <Textarea rows={2} value={item.observations} onChange={(e) => {
                            const u = [...internalItems]; u[index] = { ...u[index], observations: e.target.value }; setInternalItems(u);
                          }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">Pacote de Peças (PDF)</h3>
                        <p className="text-xs text-muted-foreground">Anexe um ou mais PDFs listando os pacotes de peças.</p>
                      </div>
                      <Button type="button" variant="outline" size="sm" onClick={() => setPartsPackages([...partsPackages, { name: "", file: null }])}>
                        <Plus className="h-4 w-4 mr-1" /> Adicionar Pacote
                      </Button>
                    </div>
                    {partsPackages.length === 0 && (
                      <p className="text-xs text-muted-foreground italic">Nenhum pacote adicionado.</p>
                    )}
                    {partsPackages.map((pkg, idx) => (
                      <div key={idx} className="p-3 border rounded-lg space-y-2 bg-background">
                        <div className="flex items-center justify-between gap-2">
                          <Label className="text-sm">Pacote {idx + 1}</Label>
                          <Button type="button" variant="ghost" size="sm" onClick={() => setPartsPackages(partsPackages.filter((_, i) => i !== idx))}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <Input
                          placeholder="Nome do pacote de peças *"
                          value={pkg.name}
                          onChange={(e) => {
                            const u = [...partsPackages]; u[idx] = { ...u[idx], name: e.target.value }; setPartsPackages(u);
                          }}
                        />
                        <Input
                          type="file"
                          accept="application/pdf"
                          onChange={(e) => {
                            const f = e.target.files?.[0] || null;
                            const u = [...partsPackages]; u[idx] = { ...u[idx], file: f }; setPartsPackages(u);
                          }}
                        />
                        {pkg.file && (
                          <p className="text-xs text-muted-foreground truncate">📄 {pkg.file.name} ({(pkg.file.size / 1024).toFixed(1)} KB)</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>




              <div className="space-y-3 p-4 rounded-lg border-2 border-primary/30 bg-primary/5">
                <h3 className="font-semibold">Termo de Responsabilidade</h3>
                <p className="text-sm text-foreground/80 leading-relaxed">
                  O solicitante declara estar ciente de sua responsabilidade pela utilização, conservação e devolução dos produtos requisitados, comprometendo-se a devolvê-los em perfeitas condições e dentro do prazo estabelecido. Após o vencimento do prazo de devolução, será gerado um alerta automático.
                </p>
                <label className="flex items-start gap-3 cursor-pointer pt-2">
                  <Checkbox checked={responsibilityAccepted} onCheckedChange={(c) => setResponsibilityAccepted(!!c)} className="mt-0.5" />
                  <span className="text-sm font-medium">Li e aceito o termo de responsabilidade acima *</span>
                </label>
              </div>

              <div className="space-y-3 p-4 bg-secondary/50 rounded-lg">
                <h3 className="font-semibold">Assinatura do Funcionário Solicitante</h3>
                <div>
                  <Label htmlFor="signatureName">Nome Completo *</Label>
                  <Input id="signatureName" value={signatureName} onChange={(e) => setSignatureName(e.target.value)} placeholder="Digite seu nome completo" required />
                </div>
                <div>
                  <Label>Assinatura *</Label>
                  <SignaturePad value={signatureData} onChange={setSignatureData} />
                </div>
                <p className="text-xs text-muted-foreground">
                  A assinatura do gerente responsável será coletada no momento da aprovação.
                </p>
              </div>
            </div>
          )}



          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Solicitação
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
