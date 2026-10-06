import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { RetroButton } from "@/components/RetroButton";
import { MissionCard } from "@/components/MissionCard";
import { FileUpload } from "@/components/FileUpload";
import { Crown, Video, Rocket, CheckCircle, Users, X, ChevronDown, Loader2, Eye, Download, RotateCcw, MessageCircle, Trash2, Upload, Send, MessageSquare, Briefcase } from "lucide-react";
import { useVideoRequests, useCrewMembers, VideoRequest, AttachmentFile } from "@/hooks/useVideoRequests";
import { useCurrentProfile } from "@/hooks/useCurrentProfile";
import { ProgressBar } from "@/components/ProgressBar";
import { MissionNotes } from "@/components/MissionNotes";

import { LogoutButton } from "@/components/LogoutButton";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

const CaptainDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("all");
  const [selectedMission, setSelectedMission] = useState<string | null>(null);
  const [showDelegateMenu, setShowDelegateMenu] = useState(false);
  const [localProgress, setLocalProgress] = useState<Record<string, number>>({});
  const [notesMission, setNotesMission] = useState<string | null>(null);
  const [uploadMission, setUploadMission] = useState<string | null>(null);
  const [deliverables, setDeliverables] = useState<AttachmentFile[]>([]);
  const { toast } = useToast();

  const { requests, loading, delegateRequest, updateStatus, openWhatsAppNotification, deleteRequest, addNote, updateProgress, refetch } = useVideoRequests();
  const { crew, loading: crewLoading } = useCrewMembers();
  const { profile, loading: profileLoading } = useCurrentProfile();

  useEffect(() => {
    if (profileLoading) return;
    if (!profile) {
      window.location.replace(import.meta.env.VITE_MKR_HUB_URL?.trim() || "http://localhost:3000/dashboard");
      return;
    }
    if (profile.role === "capitao") return;
    navigate(profile.role === "tripulante" ? "/crew" : "/dashboard", { replace: true });
  }, [navigate, profile, profileLoading]);

  if (profileLoading || !profile || profile.role !== "capitao") {
    return <div className="min-h-screen bg-background" />;
  }

  // Minhas tarefas: missões atribuídas ao próprio capitão
  const myTasks = profile
    ? requests.filter(r =>
        (r.status === 'progress' || r.status === 'alteration') &&
        r.assigned_names.includes(profile.name)
      )
    : [];

  const handleProgressChange = (id: string, v: number) =>
    setLocalProgress(p => ({ ...p, [id]: v }));
  const handleProgressCommit = (id: string, v: number) => updateProgress(id, v);

  const handleAddCaptainNote = async (id: string, text: string) => {
    if (!profile) return false;
    return await addNote(id, { author_name: profile.name, author_role: profile.role, text });
  };

  const handleSendForReview = async (id: string) => {
    await updateStatus(id, 'review');
    toast({ title: 'Enviado para revisão!', description: 'Missão marcada como aguardando aprovação.' });
  };

  const handleUploadDeliverables = async (id: string) => {
    if (deliverables.length === 0) {
      toast({ title: 'Adicione arquivos', description: 'Selecione os materiais antes de enviar.', variant: 'destructive' });
      return;
    }
    try {
      await api.updateRequest(id, { deliverables });
      toast({ title: 'Material enviado!', description: 'Anexado à missão.' });
      setDeliverables([]);
      setUploadMission(null);
      refetch();
    } catch (e) {
      console.error(e);
      toast({ title: 'Erro', description: 'Não foi possível enviar o material.', variant: 'destructive' });
    }
  };

  const statusTabs = [
    { id: "all", label: "Todas", count: requests.length },
    { id: "new", label: "Novas", count: requests.filter(m => m.status === "new").length },
    { id: "progress", label: "Em Andamento", count: requests.filter(m => m.status === "progress").length },
    { id: "review", label: "Aguardando Aprovação", count: requests.filter(m => m.status === "review").length },
    { id: "alteration", label: "Alteração", count: requests.filter(m => m.status === "alteration").length },
    { id: "completed", label: "Concluídas", count: requests.filter(m => m.status === "completed").length },
    { id: "rejected", label: "Recusadas", count: requests.filter(m => m.status === "rejected").length },
  ];

  const filteredMissions = activeTab === "all" 
    ? requests 
    : requests.filter(m => m.status === activeTab);

  const handleDelegate = async (crewMember: { id: string; name: string; role: string }) => {
    if (selectedMission) {
      await delegateRequest(selectedMission, crewMember);
      setShowDelegateMenu(false);
      setSelectedMission(null);
    }
  };

  const handleApprove = async () => {
    if (selectedMission) {
      await updateStatus(selectedMission, 'completed');
      setSelectedMission(null);
    }
  };

  const handleReject = async () => {
    if (selectedMission) {
      await updateStatus(selectedMission, 'rejected');
      setSelectedMission(null);
    }
  };

  const handleRequestAlteration = async () => {
    if (selectedMission) {
      await updateStatus(selectedMission, 'alteration');
      setSelectedMission(null);
    }
  };

  const handleWhatsApp = () => {
    const mission = requests.find(m => m.id === selectedMission);
    if (mission) {
      openWhatsAppNotification(mission);
    }
  };

  const handleDelete = async () => {
    if (selectedMission) {
      const confirmed = window.confirm('Tem certeza que deseja excluir esta missão? Esta ação não pode ser desfeita.');
      if (confirmed) {
        await deleteRequest(selectedMission);
        setSelectedMission(null);
      }
    }
  };


  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
                <Crown className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">Ponte de Comando</h1>
                <p className="text-sm text-muted-foreground">Capitão Guilherme</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
                <span className="w-2 h-2 bg-accent rounded-full animate-pulse" />
                Sistema Online
              </div>
              
              <LogoutButton variant="danger" size="sm" />
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="container mx-auto px-4 py-6">
        {/* Stats bar */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
        >
          {[
            { label: "Total", value: requests.length, icon: Video, color: "text-primary", bg: "bg-primary/10" },
            { label: "Em Andamento", value: requests.filter(r => r.status === 'progress').length, icon: Rocket, color: "text-primary", bg: "bg-primary/10" },
            { label: "Finalizadas", value: requests.filter(r => r.status === 'completed').length, icon: CheckCircle, color: "text-accent", bg: "bg-accent/10" },
             { label: "Tripulantes", value: crewLoading ? '—' : crew.length, icon: Users, color: "text-secondary", bg: "bg-secondary/10" },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: i * 0.1 }}
              className="bg-card border border-border rounded-xl p-4"
            >
              <div className={`w-10 h-10 ${stat.bg} rounded-lg flex items-center justify-center mb-3`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Status tabs */}
        <div className="flex flex-wrap gap-2 mb-6 overflow-x-auto pb-2">
          {statusTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Loading state */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : (
          <>
            {/* Minhas Tarefas (Capitão como executor) */}
            {myTasks.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-primary" />
                  Minhas Tarefas ({myTasks.length})
                </h3>
                <div className="space-y-4">
                  {myTasks.map((mission) => (
                    <div
                      key={`mine-${mission.id}`}
                      className="bg-card border border-primary/30 rounded-xl p-5"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="text-lg font-semibold text-foreground mb-1">{mission.title}</h4>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span className="text-secondary font-medium">{mission.video_type}</span>
                            <span>•</span>
                            <span>{mission.requester_name}</span>
                          </div>
                        </div>
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                          mission.status === 'progress'
                            ? 'bg-primary/20 text-primary'
                            : 'bg-yellow-500/20 text-yellow-500'
                        }`}>
                          {mission.status === 'progress' ? 'Em Andamento' : 'Alteração'}
                        </span>
                      </div>
                      {mission.description && (
                        <p className="text-muted-foreground mb-4">{mission.description}</p>
                      )}

                      <ProgressBar
                        value={localProgress[mission.id] ?? mission.progress ?? 0}
                        label="Progresso da Missão"
                        size="md"
                        className="mb-3"
                      />
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={localProgress[mission.id] ?? mission.progress ?? 0}
                        onChange={(e) => handleProgressChange(mission.id, parseInt(e.target.value))}
                        onMouseUp={(e) => handleProgressCommit(mission.id, parseInt((e.target as HTMLInputElement).value))}
                        onTouchEnd={(e) => handleProgressCommit(mission.id, parseInt((e.target as HTMLInputElement).value))}
                        className="w-full h-2 bg-muted rounded-full appearance-none cursor-pointer accent-primary mb-4"
                      />

                      <div className="mb-4">
                        <MissionNotes notes={mission.notes || []} compact />
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <RetroButton variant="primary" size="sm" onClick={() => setNotesMission(mission.id)}>
                          <MessageSquare size={14} className="mr-2" />
                          Adicionar Nota
                        </RetroButton>
                        <RetroButton variant="secondary" size="sm" onClick={() => setUploadMission(mission.id)}>
                          <Upload size={14} className="mr-2" />
                          Enviar Material Final
                        </RetroButton>
                        <RetroButton variant="accent" size="sm" onClick={() => handleSendForReview(mission.id)}>
                          <Send size={14} className="mr-2" />
                          Enviar para Aprovação
                        </RetroButton>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}


            {/* Mission cards grid */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {filteredMissions.map((mission, index) => (
                <motion.div
                  key={mission.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <MissionCard
                    id={mission.id}
                    title={mission.title}
                    requester={mission.requester_name}
                    videoType={mission.video_type}
                    status={mission.status}
                    description={mission.description || ''}
                    createdAt={new Date(mission.created_at).toLocaleDateString('pt-BR')}
                    assignees={mission.assigned_names}
                    progress={mission.progress}
                    onClick={() => setSelectedMission(mission.id)}
                  />
                </motion.div>
              ))}
            </motion.div>

            {filteredMissions.length === 0 && (
              <div className="text-center py-12">
                <Video className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhuma missão encontrada</p>
              </div>
            )}
          </>
        )}
      </main>

      {/* Mission detail modal */}
      {selectedMission && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => {
            setSelectedMission(null);
            setShowDelegateMenu(false);
          }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-card border border-border rounded-xl p-6 max-w-lg w-full max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-foreground">Detalhes da Missão</h2>
              <button
                onClick={() => {
                  setSelectedMission(null);
                  setShowDelegateMenu(false);
                }}
                className="text-muted-foreground hover:text-destructive p-1"
              >
                <X size={20} />
              </button>
            </div>
            {(() => {
              const mission = requests.find(m => m.id === selectedMission);
              if (!mission) return null;
              return (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Título</p>
                    <p className="text-foreground font-medium">{mission.title}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Descrição</p>
                    <p className="text-foreground">{mission.description}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Solicitante</p>
                      <p className="text-foreground">{mission.requester_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Tipo</p>
                      <p className="text-primary font-medium">{mission.video_type}</p>
                    </div>
                  </div>
                  {(mission.brand || mission.platform) && (
                    <div className="grid grid-cols-2 gap-4">
                      {mission.brand && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Marca</p>
                          <p className="text-foreground">{mission.brand}</p>
                        </div>
                      )}
                      {mission.platform && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Plataforma</p>
                          <p className="text-foreground">{mission.platform}</p>
                        </div>
                      )}
                    </div>
                  )}
                  {(mission.format || mission.orientation) && (
                    <div className="grid grid-cols-2 gap-4">
                      {mission.format && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Formato</p>
                          <p className="text-foreground">{mission.format}</p>
                        </div>
                      )}
                      {mission.orientation && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Orientação</p>
                          <p className="text-foreground capitalize">{mission.orientation}</p>
                        </div>
                      )}
                    </div>
                  )}
                  {(mission.deadline || mission.whatsapp) && (
                    <div className="grid grid-cols-2 gap-4">
                      {mission.deadline && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Prazo</p>
                          <p className="text-foreground">{new Date(mission.deadline).toLocaleDateString('pt-BR')}</p>
                        </div>
                      )}
                      {mission.whatsapp && (
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">WhatsApp</p>
                          <p className="text-foreground">{mission.whatsapp}</p>
                        </div>
                      )}
                    </div>
                  )}
                  {mission.assigned_names.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Atribuído para</p>
                      <p className="text-foreground">{mission.assigned_names.join(', ')}</p>
                    </div>
                  )}

                  {/* Progress */}
                  {(mission.status === 'progress' || mission.status === 'alteration' || mission.status === 'review') && (
                    <div>
                      <ProgressBar
                        value={mission.progress ?? 0}
                        label="Progresso da Missão"
                        size="md"
                      />
                    </div>
                  )}

                  {/* Notes */}
                  <div className="border-t border-border pt-4">
                    <MissionNotes
                      notes={mission.notes || []}
                      canAdd={!!profile}
                      onAdd={profile ? (text) => addNote(mission.id, {
                        author_name: profile.name,
                        author_role: profile.role,
                        text,
                      }) : undefined}
                      compact
                    />
                  </div>

                  {/* Deliverables - Material finalizado */}
                  {mission.deliverables && mission.deliverables.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Material Finalizado</p>
                      <div className="space-y-2">
                        {mission.deliverables.map((file: AttachmentFile, idx: number) => (
                          <a
                            key={idx}
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 bg-muted p-2 rounded-lg hover:bg-muted/80 transition-colors"
                          >
                            <Download size={16} className="text-accent" />
                            <span className="text-sm text-foreground truncate flex-1">{file.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {(file.size / (1024 * 1024)).toFixed(1)} MB
                            </span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Attachments - Material de apoio do solicitante */}
                  {mission.attachments && mission.attachments.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Materiais de Apoio</p>
                      <div className="space-y-2">
                        {mission.attachments.map((file: AttachmentFile, idx: number) => (
                          <a
                            key={idx}
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 bg-muted p-2 rounded-lg hover:bg-muted/80 transition-colors"
                          >
                            <Download size={16} className="text-primary" />
                            <span className="text-sm text-foreground truncate flex-1">{file.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {(file.size / (1024 * 1024)).toFixed(1)} MB
                            </span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 pt-4">
                    {/* Delegar - apenas se não estiver em review */}
                    {mission.status !== 'review' && mission.status !== 'completed' && (
                      <div className="relative">
                        <RetroButton 
                          variant="primary" 
                          size="sm"
                          onClick={() => setShowDelegateMenu(!showDelegateMenu)}
                        >
                          Delegar
                          <ChevronDown size={16} className={`ml-1 transition-transform ${showDelegateMenu ? 'rotate-180' : ''}`} />
                        </RetroButton>
                        <AnimatePresence>
                          {showDelegateMenu && (
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              className="absolute top-full left-0 mt-2 w-48 bg-card border border-border rounded-lg shadow-lg z-50 overflow-hidden"
                            >
                              <p className="px-3 py-2 text-xs text-muted-foreground border-b border-border">
                                Selecione um tripulante:
                              </p>
                              {crewLoading ? (
                                <div className="px-3 py-3 text-sm text-muted-foreground">Carregando...</div>
                              ) : crew.length === 0 ? (
                                <div className="px-3 py-3 text-sm text-muted-foreground">Nenhum tripulante encontrado.</div>
                              ) : (
                                crew.map((member) => (
                                  <button
                                    key={member.id}
                                    onClick={() => handleDelegate(member)}
                                    className="w-full px-3 py-2 text-left text-foreground hover:bg-primary/10 transition-colors flex items-center gap-2"
                                  >
                                    <Users size={16} className="text-primary" />
                                    {member.name}
                                  </button>
                                ))
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                    {/* Botões específicos para missões em review */}
                    {mission.status === 'review' && (
                      <>
                        <RetroButton variant="accent" size="sm" onClick={handleApprove}>
                          <CheckCircle size={14} className="mr-1" />
                          Aprovar
                        </RetroButton>
                        <RetroButton variant="secondary" size="sm" onClick={handleRequestAlteration}>
                          <RotateCcw size={14} className="mr-1" />
                          Solicitar Alteração
                        </RetroButton>
                      </>
                    )}

                    {/* Botões para outras missões */}
                    {mission.status !== 'review' && mission.status !== 'completed' && (
                      <>
                        <RetroButton variant="accent" size="sm" onClick={handleApprove}>
                          Aprovar
                        </RetroButton>
                        <RetroButton variant="danger" size="sm" onClick={handleReject}>
                          Recusar
                        </RetroButton>
                      </>
                    )}

                    {/* Botão de WhatsApp opcional - sempre visível se tiver WhatsApp */}
                    {mission.whatsapp && (
                      <RetroButton variant="outline" size="sm" onClick={handleWhatsApp}>
                        <MessageCircle size={14} className="mr-1" />
                        WhatsApp
                      </RetroButton>
                    )}

                    {/* Botão de excluir - sempre disponível */}
                    <RetroButton variant="danger" size="sm" onClick={handleDelete}>
                      <Trash2 size={14} className="mr-1" />
                      Excluir
                    </RetroButton>
                  </div>
                </div>
              );
            })()}
          </motion.div>
        </motion.div>
      )}

      {/* Add note modal (Minhas Tarefas) */}
      {notesMission && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setNotesMission(null)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-card border border-border rounded-xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-foreground">Observações da Missão</h2>
              <button onClick={() => setNotesMission(null)} className="text-muted-foreground hover:text-destructive p-1">
                <X size={20} />
              </button>
            </div>
            {(() => {
              const mission = requests.find(r => r.id === notesMission);
              if (!mission) return null;
              return (
                <MissionNotes
                  notes={mission.notes || []}
                  canAdd={!!profile}
                  onAdd={(text) => handleAddCaptainNote(mission.id, text)}
                />
              );
            })()}
          </motion.div>
        </motion.div>
      )}

      {/* Upload material modal (Minhas Tarefas) */}
      {uploadMission && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => { setUploadMission(null); setDeliverables([]); }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-card border border-border rounded-xl p-6 max-w-lg w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-foreground">Enviar Material Finalizado</h2>
              <button
                onClick={() => { setUploadMission(null); setDeliverables([]); }}
                className="text-muted-foreground hover:text-destructive p-1"
              >
                <X size={20} />
              </button>
            </div>
            <FileUpload onFilesChange={setDeliverables} maxSizeMB={500} />
            <div className="flex justify-end gap-2 mt-4">
              <RetroButton variant="outline" size="sm" onClick={() => { setUploadMission(null); setDeliverables([]); }}>
                Cancelar
              </RetroButton>
              <RetroButton variant="accent" size="sm" onClick={() => handleUploadDeliverables(uploadMission)}>
                <Upload size={14} className="mr-2" />
                Enviar
              </RetroButton>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>

  );
};

export default CaptainDashboard;
