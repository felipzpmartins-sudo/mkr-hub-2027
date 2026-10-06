import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { RetroButton } from "@/components/RetroButton";
import { ProgressBar } from "@/components/ProgressBar";
import { RetroTextarea } from "@/components/RetroTextarea";
import { FileUpload } from "@/components/FileUpload";
import { MissionNotes } from "@/components/MissionNotes";
import { Users, Video, Clock, Send, CheckCircle, X, MessageSquare, Loader2, Upload, Eye, Crown } from "lucide-react";
import { useVideoRequests, VideoRequest, AttachmentFile, useCrewMembers } from "@/hooks/useVideoRequests";
import { useCurrentProfile } from "@/hooks/useCurrentProfile";
import { LogoutButton } from "@/components/LogoutButton";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";


const CrewDashboard = () => {
  const navigate = useNavigate();
  const [selectedMission, setSelectedMission] = useState<string | null>(null);
  const [uploadMission, setUploadMission] = useState<string | null>(null);
  const [localProgress, setLocalProgress] = useState<Record<string, number>>({});
  const [deliverables, setDeliverables] = useState<AttachmentFile[]>([]);
  const { toast } = useToast();

  const { requests, loading, updateStatus, refetch, updateProgress, addNote } = useVideoRequests();
  const { crew } = useCrewMembers();
  const { profile } = useCurrentProfile();

  // Filtrar missões em andamento ou alteração
  const myMissions = requests.filter(r => r.status === 'progress' || r.status === 'alteration');
  // Missões aguardando aprovação do capitão
  const reviewMissions = requests.filter(r => r.status === 'review');

  const crewMember = profile?.name ?? "Tripulante";

  // Contar missões concluídas por tripulante
  const getMissionCount = (memberName: string) => {
    return requests.filter(r =>
      r.status === 'completed' && r.assigned_names.includes(memberName)
    ).length;
  };

  const handleProgressChange = (missionId: string, value: number) => {
    setLocalProgress(prev => ({ ...prev, [missionId]: value }));
  };

  const handleProgressCommit = (missionId: string, value: number) => {
    updateProgress(missionId, value);
  };

  const handleAddNote = async (missionId: string, text: string) => {
    if (!profile) {
      toast({ title: 'Sessão necessária', description: 'Faça login novamente.', variant: 'destructive' });
      return false;
    }
    return await addNote(missionId, {
      author_name: profile.name,
      author_role: profile.role,
      text,
    });
  };

  const handleSendForReview = async (missionId: string) => {
    await updateStatus(missionId, 'review');
    toast({
      title: "Enviado para revisão!",
      description: "Aguardando aprovação do Capitão.",
    });
  };

  const handleUploadDeliverables = async (missionId: string) => {
    if (deliverables.length === 0) {
      toast({
        title: "Adicione arquivos",
        description: "Selecione os materiais finalizados antes de enviar.",
        variant: "destructive",
      });
      return;
    }

    try {
      await api.updateRequest(missionId, { deliverables });

      toast({
        title: "Material enviado!",
        description: "O material finalizado foi anexado à missão.",
      });
      
      setDeliverables([]);
      setUploadMission(null);
      refetch();
    } catch (error) {
      console.error('Erro ao enviar material:', error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar o material.",
        variant: "destructive",
      });
    }
  };


  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-secondary/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-secondary" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">Estação de Trabalho</h1>
                <p className="text-sm text-muted-foreground">{crewMember}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
                <span className="w-2 h-2 bg-secondary rounded-full animate-pulse" />
                {myMissions.length} Missões Ativas
              </div>
              {profile?.role === "capitao" && (
                <RetroButton variant="secondary" size="sm" onClick={() => navigate("/captain")}>
                  <Crown size={14} className="mr-2" />
                  Área administrativa
                </RetroButton>
              )}
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
          className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6"
        >
          {[
            { label: "Atribuídas", value: myMissions.length, icon: Video, color: "text-secondary", bg: "bg-secondary/10" },
            { label: "Em Progresso", value: requests.filter(r => r.status === 'progress').length, icon: Clock, color: "text-primary", bg: "bg-primary/10" },
            { label: "Alteração", value: requests.filter(r => r.status === 'alteration').length, icon: Send, color: "text-yellow-500", bg: "bg-yellow-500/10" },
            { label: "Aguardando Aprovação", value: reviewMissions.length, icon: Eye, color: "text-orange-500", bg: "bg-orange-500/10" },
            { label: "Concluídas", value: requests.filter(r => r.status === 'completed').length, icon: CheckCircle, color: "text-accent", bg: "bg-accent/10" },
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: i * 0.1 }}
              className="bg-card border border-border rounded-xl p-4"
            >
              <div className={`w-10 h-10 ${stat.bg} rounded-lg flex items-center justify-center mb-2`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Crew profile stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h3 className="text-lg font-semibold text-foreground mb-4">Perfil da Tripulação</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {crew.map((member, index) => (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-card border border-border rounded-xl p-4 flex items-center gap-4"
              >
                <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center">
                  <Users className="w-6 h-6 text-secondary" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">{member.name}</p>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle size={14} className="text-accent" />
                    <span className="text-accent font-medium">{getMissionCount(member.name)}</span>
                    <span className="text-muted-foreground">missões concluídas</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Loading state */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : (
          <>
            {/* Aguardando Aprovação section */}
            {reviewMissions.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Eye className="w-5 h-5 text-orange-500" />
                  Aguardando Aprovação do Capitão ({reviewMissions.length})
                </h3>
                <div className="space-y-4">
                  {reviewMissions.map((mission, index) => (
                    <motion.div
                      key={mission.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="bg-card border border-orange-500/30 rounded-xl p-5"
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
                        <span className="px-3 py-1 text-xs font-medium rounded-full bg-orange-500/20 text-orange-500">
                          Aguardando Aprovação
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Enviado para revisão em {new Date(mission.updated_at).toLocaleDateString('pt-BR')}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Missions list */}
            <h3 className="text-lg font-semibold text-foreground mb-4">Suas Missões Ativas</h3>
            <div className="space-y-4">
              {myMissions.map((mission, index) => (
                <motion.div
                  key={mission.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-card border border-border rounded-xl p-5 hover:border-secondary/50 transition-colors"
                >
                  <div className="flex flex-col gap-4">
                    {/* Mission info */}
                    <div>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="text-lg font-semibold text-foreground mb-1">{mission.title}</h4>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span className="text-secondary font-medium">{mission.video_type}</span>
                            <span>•</span>
                            <span>{mission.requester_name}</span>
                            <span>•</span>
                            <span>{new Date(mission.created_at).toLocaleDateString('pt-BR')}</span>
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
                      <p className="text-muted-foreground mb-4">{mission.description}</p>

                      {/* Progress bar */}
                      <ProgressBar
                        value={localProgress[mission.id] ?? mission.progress ?? 0}
                        label="Progresso da Missão"
                        size="md"
                        className="mb-4"
                      />

                      {/* Progress slider */}
                      <div className="mb-4">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={localProgress[mission.id] ?? mission.progress ?? 0}
                          onChange={(e) => handleProgressChange(mission.id, parseInt(e.target.value))}
                          onMouseUp={(e) => handleProgressCommit(mission.id, parseInt((e.target as HTMLInputElement).value))}
                          onTouchEnd={(e) => handleProgressCommit(mission.id, parseInt((e.target as HTMLInputElement).value))}
                          className="w-full h-2 bg-muted rounded-full appearance-none cursor-pointer accent-primary"
                        />
                      </div>

                      {/* Notes */}
                      <div className="mb-4">
                        <MissionNotes notes={mission.notes || []} compact />
                      </div>


                      {/* Assigned to */}
                      {mission.assigned_names.length > 0 && (
                        <div className="mb-4">
                          <p className="text-sm text-muted-foreground flex items-center gap-2">
                            <Users size={14} />
                            Atribuído para: <span className="text-primary">{mission.assigned_names.join(', ')}</span>
                          </p>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2">
                        <RetroButton
                          variant="primary"
                          size="sm"
                          onClick={() => setSelectedMission(mission.id)}
                        >
                          <MessageSquare size={14} className="mr-2" />
                          Adicionar Nota
                        </RetroButton>
                        <RetroButton
                          variant="secondary"
                          size="sm"
                          onClick={() => setUploadMission(mission.id)}
                        >
                          <Upload size={14} className="mr-2" />
                          Enviar Material
                        </RetroButton>
                        <RetroButton 
                          variant="accent" 
                          size="sm"
                          onClick={() => handleSendForReview(mission.id)}
                        >
                          <Send size={14} className="mr-2" />
                          Enviar para Aprovação
                        </RetroButton>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {myMissions.length === 0 && (
              <div className="text-center py-12 bg-card border border-border rounded-xl">
                <Video className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhuma missão atribuída</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Aguarde o Capitão delegar novas missões para você.
                </p>
              </div>
            )}
          </>
        )}
      </main>

      {/* Add note modal */}
      {selectedMission && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedMission(null)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-card border border-border rounded-xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-foreground">Observações da Missão</h2>
              <button
                onClick={() => setSelectedMission(null)}
                className="text-muted-foreground hover:text-destructive p-1"
              >
                <X size={20} />
              </button>
            </div>

            {(() => {
              const mission = requests.find(r => r.id === selectedMission);
              if (!mission) return null;
              return (
                <MissionNotes
                  notes={mission.notes || []}
                  canAdd
                  onAdd={(text) => handleAddNote(mission.id, text)}
                />
              );
            })()}
          </motion.div>
        </motion.div>
      )}

      {/* Upload material modal */}
      {uploadMission && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => {
            setUploadMission(null);
            setDeliverables([]);
          }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-card border border-border rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold text-foreground">Enviar Material Finalizado</h2>
              <button
                onClick={() => {
                  setUploadMission(null);
                  setDeliverables([]);
                }}
                className="text-muted-foreground hover:text-destructive p-1"
              >
                <X size={20} />
              </button>
            </div>

            <p className="text-muted-foreground mb-4">
              Anexe o vídeo ou materiais finalizados para esta missão. O Capitão irá revisar antes de enviar ao solicitante.
            </p>

            <FileUpload
              onFilesChange={setDeliverables}
              maxSizeMB={500}
            />

            <div className="flex gap-2 mt-6">
              <RetroButton
                variant="accent"
                className="flex-1"
                onClick={() => handleUploadDeliverables(uploadMission)}
              >
                <Upload size={16} className="mr-2" />
                Enviar Material
              </RetroButton>
              <RetroButton 
                variant="outline" 
                onClick={() => {
                  setUploadMission(null);
                  setDeliverables([]);
                }}
              >
                Cancelar
              </RetroButton>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};

export default CrewDashboard;
