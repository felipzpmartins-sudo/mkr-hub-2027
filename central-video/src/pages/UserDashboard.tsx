import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { RetroButton } from "@/components/RetroButton";
import { RetroInput } from "@/components/RetroInput";
import { RetroTextarea } from "@/components/RetroTextarea";
import { MissionCard } from "@/components/MissionCard";
import { FileUpload } from "@/components/FileUpload";
import { PlatformSelector } from "@/components/PlatformSelector";
import { OrientationSelector } from "@/components/OrientationSelector";
import { RequestDetailsModal } from "@/components/RequestDetailsModal";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { User, Rocket, Video, CheckCircle, Clock, X, Plus, Loader2, Send, CalendarIcon, Crown, Users } from "lucide-react";
import { useVideoRequests, AttachmentFile, VideoRequest } from "@/hooks/useVideoRequests";
import { useCurrentProfile } from "@/hooks/useCurrentProfile";
import { cn } from "@/lib/utils";

import { LogoutButton } from "@/components/LogoutButton";
import { useToast } from "@/hooks/use-toast";

const videoTypes = [
  "Institucional",
  "Tutorial",
  "Marketing",
  "Depoimento",
  "Treinamento",
  "Comercial",
  "Evento",
  "Outro",
];

const brands = [
  "Maker Robotics",
  "Myrobot",
  "MBA",
  "Makerstore",
  "Maker Education",
  "Roboshop",
  "Paraguay",
  "Beto",
  "Produto patenteado",
  "Reportagem",
  "Outro",
];

const UserDashboard = () => {
  const navigate = useNavigate();
  const [showNewMission, setShowNewMission] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<VideoRequest | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    video_type: "",
    description: "",
    requester_name: "",
    whatsapp: "",
    brand: "",
    customBrand: "",
    platform: "",
    format: "",
    orientation: "" as "vertical" | "horizontal" | "",
    deadline: undefined as Date | undefined,
    drive_url: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);

  const { requests, loading, createRequest, updateStatus, addNote } = useVideoRequests();
  const { profile } = useCurrentProfile();
  const { toast } = useToast();
  
  const completedRequests = requests.filter(r => r.status === "completed");
  const hasCompletedRequests = completedRequests.length > 0;

  // Minimum date is 6 days from now
  const minDeadlineDate = addDays(new Date(), 6);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedBrand = formData.brand === "Outro" ? formData.customBrand : formData.brand;
    if (!formData.title || !formData.video_type || !formData.requester_name || !selectedBrand || !formData.platform || !formData.format || !formData.orientation || !formData.deadline) {
      toast({
        title: "Preencha todos os campos obrigatórios",
        description: "Confira nome, WhatsApp, título, tipo, marca, plataforma, formato, orientação e prazo.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    const result = await createRequest({
      title: formData.title,
      video_type: formData.video_type,
      description: formData.description,
      requester_name: formData.requester_name,
      whatsapp: formData.whatsapp,
      brand: selectedBrand,
      platform: formData.platform,
      format: formData.format,
      orientation: formData.orientation,
      deadline: format(formData.deadline, 'yyyy-MM-dd'),
      drive_url: formData.drive_url,
      attachments,
    });
    setSubmitting(false);

    if (result) {
      setFormData({ 
        title: "", 
        video_type: "", 
        description: "", 
        requester_name: "", 
        whatsapp: "", 
        brand: "", 
        customBrand: "",
        platform: "",
        format: "",
        orientation: "",
        deadline: undefined,
        drive_url: "",
      });
      setAttachments([]);
      setShowNewMission(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border sticky top-0 z-40 bg-background">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 border border-border flex items-center justify-center">
                <User className="w-4 h-4 text-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-light text-foreground tracking-wide">Minhas Solicitações</h1>
                <p className="text-xs text-muted-foreground tracking-wider uppercase">Central de Vídeos</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <RetroButton variant="outline" size="sm" onClick={() => navigate("/team")}>
                <Users size={14} className="mr-2" />
                Equipe
              </RetroButton>
              {profile?.role === "capitao" && (
                <RetroButton variant="secondary" size="sm" onClick={() => navigate("/captain")}>
                  <Crown size={14} className="mr-2" />
                  Área administrativa
                </RetroButton>
              )}
              <RetroButton variant="primary" size="sm" onClick={() => setShowNewMission(true)}>
                <Plus size={14} className="mr-2" />
                Nova
              </RetroButton>
              <LogoutButton variant="ghost" size="sm" showLabel={false} />
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-6 py-8">
        {/* Stats */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          {[
            { label: "Total", value: requests.length, icon: Video },
            { label: "Novas", value: requests.filter(r => r.status === "new").length, icon: Rocket },
            { label: "Em Andamento", value: requests.filter(r => r.status === "progress").length, icon: Clock },
            { label: "Concluídas", value: requests.filter(r => r.status === "completed").length, icon: CheckCircle },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: i * 0.1 }}
              className="bg-card border border-border p-6"
            >
              <stat.icon className="w-5 h-5 text-muted-foreground mb-4" />
              <p className="text-3xl font-light text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground tracking-wider uppercase mt-1">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Completed notification banner */}
        <AnimatePresence>
          {hasCompletedRequests && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-8 border border-foreground bg-foreground/5 p-6"
            >
              <div className="flex items-center gap-6">
                <div className="w-12 h-12 border border-foreground flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-foreground" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-light text-foreground">Seu pedido está pronto</h3>
                  <p className="text-sm text-muted-foreground">
                    {completedRequests.length === 1 
                      ? "Você tem 1 vídeo finalizado"
                      : `Você tem ${completedRequests.length} vídeos finalizados`}
                  </p>
                </div>
                <RetroButton 
                  variant="primary" 
                  size="sm"
                  onClick={() => setSelectedRequest(completedRequests[0])}
                >
                  Ver Pedido
                </RetroButton>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <h3 className="text-xs font-medium text-muted-foreground tracking-wider uppercase mb-6">Suas Solicitações</h3>

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
          </div>
        ) : requests.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20 border border-border"
          >
            <Video className="w-12 h-12 text-muted-foreground mx-auto mb-6" />
            <h2 className="text-xl font-light text-foreground mb-2">
              Nenhuma solicitação ainda
            </h2>
            <p className="text-muted-foreground mb-8 text-sm">
              Clique no botão acima para criar sua primeira solicitação
            </p>
            <RetroButton variant="primary" onClick={() => setShowNewMission(true)}>
              <Plus size={16} className="mr-2" />
              Criar Solicitação
            </RetroButton>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {requests.map((request, index) => (
              <motion.div
                key={request.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => setSelectedRequest(request)}
                className="cursor-pointer"
              >
                <div className="relative">
                  {request.status === "completed" && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-2 -right-2 z-10 bg-foreground text-background text-xs font-medium px-3 py-1 flex items-center gap-1"
                    >
                      <CheckCircle size={12} />
                      Pronto
                    </motion.div>
                  )}
                  <MissionCard
                    id={request.id}
                    title={request.title}
                    requester={request.requester_name}
                    videoType={request.video_type}
                    status={request.status}
                    description={request.description || ''}
                    createdAt={new Date(request.created_at).toLocaleDateString('pt-BR')}
                    assignees={request.assigned_names}
                    progress={request.progress}
                  />
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </main>

      {/* New mission modal */}
      {showNewMission && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowNewMission(false)}
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-8">
              <div>
                <h2 className="text-2xl font-light text-foreground">Nova Solicitação</h2>
                <p className="text-sm text-muted-foreground mt-1">Preencha os dados abaixo</p>
              </div>
              <button
                onClick={() => setShowNewMission(false)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <RetroInput
                label="Seu Nome"
                placeholder="Digite seu nome"
                value={formData.requester_name}
                onChange={(e) => setFormData({ ...formData, requester_name: e.target.value })}
                required
              />

              <div className="space-y-1">
                <RetroInput
                  label="WhatsApp"
                  placeholder="(11) 99999-9999"
                  value={formData.whatsapp}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 11);
                    let formatted = value;
                    if (value.length > 2) {
                      formatted = `(${value.slice(0, 2)}) ${value.slice(2)}`;
                    }
                    if (value.length > 7) {
                      formatted = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
                    }
                    setFormData({ ...formData, whatsapp: formatted });
                  }}
                  required
                />
                <p className="text-[10px] text-muted-foreground italic pl-1">
                  * Informe um número válido para receber notificações
                </p>
              </div>

              <RetroInput
                label="Título do Vídeo"
                placeholder="Ex: Vídeo Institucional da Empresa"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />

              <div>
                <label className="block text-xs font-medium text-muted-foreground tracking-wider uppercase mb-3">
                  Tipo de Vídeo
                </label>
                <select
                  value={formData.video_type}
                  onChange={(e) => setFormData({ ...formData, video_type: e.target.value })}
                  className="w-full bg-transparent border-0 border-b border-border px-0 py-3 text-foreground focus:outline-none focus:border-foreground transition-colors"
                  required
                >
                  <option value="" className="bg-card">Selecione um tipo</option>
                  {videoTypes.map((type) => (
                    <option key={type} value={type} className="bg-card">
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground tracking-wider uppercase mb-3">
                  Marca / Finalidade
                </label>
                <select
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value, customBrand: "" })}
                  className="w-full bg-transparent border-0 border-b border-border px-0 py-3 text-foreground focus:outline-none focus:border-foreground transition-colors"
                  required
                >
                  <option value="" className="bg-card">Selecione uma marca</option>
                  {brands.map((brand) => (
                    <option key={brand} value={brand} className="bg-card">
                      {brand}
                    </option>
                  ))}
                </select>
              </div>

              {formData.brand === "Outro" && (
                <RetroInput
                  label="Especifique a marca"
                  placeholder="Digite o nome da marca"
                  value={formData.customBrand}
                  onChange={(e) => setFormData({ ...formData, customBrand: e.target.value })}
                  required
                />
              )}

              {/* Separador visual */}
              <div className="border-t border-border pt-6 mt-6">
                <p className="text-xs text-muted-foreground tracking-wider uppercase mb-6 text-center">
                  Configurações do Vídeo
                </p>
              </div>

              {/* Seleção de Plataforma e Formato */}
              <PlatformSelector
                platform={formData.platform}
                format={formData.format}
                 onPlatformChange={(platform) =>
                   setFormData((prev) => ({ ...prev, platform, format: "" }))
                 }
                 onFormatChange={(format) =>
                   setFormData((prev) => ({ ...prev, format }))
                 }
              />

              {/* Seleção de Orientação */}
              <OrientationSelector
                value={formData.orientation}
                onChange={(orientation) => setFormData({ ...formData, orientation })}
              />

              {/* Prazo de Entrega */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground tracking-wider uppercase mb-3">
                  Previsão de Entrega
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "w-full flex items-center justify-between bg-transparent border-0 border-b border-border px-0 py-3 text-left focus:outline-none focus:border-foreground transition-colors cursor-pointer",
                        !formData.deadline && "text-muted-foreground"
                      )}
                    >
                      {formData.deadline ? (
                        format(formData.deadline, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                      ) : (
                        <span>Selecione a previsão de entrega</span>
                      )}
                      <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-card border border-border" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.deadline}
                      onSelect={(date) => setFormData({ ...formData, deadline: date })}
                      disabled={(date) => date < minDeadlineDate}
                      initialFocus
                      className="p-3 pointer-events-auto"
                      locale={ptBR}
                    />
                    <div className="px-3 pb-3">
                      <p className="text-xs text-muted-foreground text-center">
                        ⚠️ Prazo mínimo de 6 dias úteis
                      </p>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-4 pt-4 border-t border-border">
                <label className="block text-xs font-medium text-muted-foreground tracking-wider uppercase">
                  Briefing e Detalhes
                </label>
                <div className="bg-muted/30 p-4 rounded-lg border border-border/50">
                  <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed">
                    <span className="font-bold text-foreground italic">Dica para um bom vídeo:</span> Descreva detalhadamente o que você precisa. Inclua referências, textos que devem aparecer na tela, cores da marca e o objetivo principal do vídeo.
                  </p>
                  <RetroTextarea
                    placeholder="Insira as instruções, referências e o briefing detalhado para a produção do vídeo..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="min-h-[150px] bg-transparent"
                    rows={4}
                  />
                </div>
              </div>
              
              <div className="space-y-4 pt-4 border-t border-border">
                <RetroInput
                  label="Link do Drive / Materiais Externos"
                  placeholder="https://drive.google.com/..."
                  value={formData.drive_url}
                  onChange={(e) => setFormData({ ...formData, drive_url: e.target.value })}
                />
                <p className="text-[10px] text-muted-foreground italic pl-1">
                  * Cole aqui o link se seus arquivos forem muito grandes ou estiverem no Google Drive/WeTransfer
                </p>
              </div>

              <FileUpload
                onFilesChange={setAttachments}
                maxSizeMB={500}
              />

              <div className="flex gap-3 pt-6 border-t border-border">
                <RetroButton
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowNewMission(false)}
                >
                  Cancelar
                </RetroButton>
                <RetroButton
                  type="submit"
                  variant="primary"
                  className="flex-1"
                  disabled={submitting}
                >
                  {submitting ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <>
                      Enviar
                      <Send size={14} className="ml-2" />
                    </>
                  )}
                </RetroButton>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}

      {/* View request details modal */}
      {selectedRequest && (
        <RequestDetailsModal
          request={requests.find(r => r.id === selectedRequest.id) ?? selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onRequestAlteration={(requestId) => {
            updateStatus(requestId, 'alteration');
          }}
          onAddNote={profile ? (requestId, text) => addNote(requestId, {
            author_name: profile.name,
            author_role: profile.role,
            text,
          }) : undefined}
        />
      )}
    </div>
  );
};

export default UserDashboard;
