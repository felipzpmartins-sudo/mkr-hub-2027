import { motion } from "framer-motion";
import { X, Video, Clock, CheckCircle, AlertTriangle, Download, FileText, Calendar, User, Smartphone, MonitorPlay, RotateCcw, MessageSquare, LucideIcon, ExternalLink, Link } from "lucide-react";
import { RetroButton } from "@/components/RetroButton";
import { VideoRequest, AttachmentFile } from "@/hooks/useVideoRequests";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { ProgressBar } from "@/components/ProgressBar";
import { MissionNotes } from "@/components/MissionNotes";

interface RequestDetailsModalProps {
  request: VideoRequest;
  onClose: () => void;
  onRequestAlteration?: (requestId: string) => void;
  onAddNote?: (requestId: string, text: string) => Promise<boolean> | boolean;
}

const statusConfig: Record<string, { label: string; icon: LucideIcon }> = {
  new: { label: "Nova", icon: Video },
  progress: { label: "Em Andamento", icon: Clock },
  alteration: { label: "Em Alteração", icon: RotateCcw },
  review: { label: "Aguardando Aprovação", icon: AlertTriangle },
  completed: { label: "Finalizado", icon: CheckCircle },
  rejected: { label: "Recusado", icon: X },
};

export function RequestDetailsModal({ request, onClose, onRequestAlteration, onAddNote }: RequestDetailsModalProps) {
  const [showAlterationWarning, setShowAlterationWarning] = useState(false);
  
  const statusInfo = statusConfig[request.status] || statusConfig.new;
  const StatusIcon = statusInfo.icon;
  
  const isInProgress = request.status === "progress" || request.status === "alteration";
  const canRequestAlteration = request.status === "progress" || request.status === "review";

  const handleRequestAlteration = () => {
    if (isInProgress) {
      setShowAlterationWarning(true);
    } else {
      onRequestAlteration?.(request.id);
      onClose();
    }
  };

  const confirmAlteration = () => {
    onRequestAlteration?.(request.id);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 border flex items-center justify-center ${
              request.status === "completed" ? "border-foreground bg-foreground/5" : "border-border"
            }`}>
              <StatusIcon className="w-5 h-5 text-foreground" />
            </div>
            <div>
              <h2 className="text-xl font-light text-foreground">{request.title}</h2>
              <p className="text-sm text-muted-foreground">{statusInfo.label}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Alteration Warning Modal */}
        {showAlterationWarning && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6 border border-yellow-500/50 bg-yellow-500/10 p-4"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-foreground mb-2">Atenção</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Como seu pedido já está em produção, solicitar alteração fará com que ele <strong>volte para a fila</strong> e seja reprocessado desde o início.
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  O trabalho feito até agora não será perdido, mas a prioridade será reiniciada.
                </p>
                <div className="flex gap-2">
                  <RetroButton
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAlterationWarning(false)}
                  >
                    Cancelar
                  </RetroButton>
                  <RetroButton
                    variant="primary"
                    size="sm"
                    onClick={confirmAlteration}
                  >
                    Confirmar Alteração
                  </RetroButton>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Request Details */}
        <div className="space-y-4">
          {/* Type and Brand */}
          <div className="grid grid-cols-2 gap-4 border-b border-border pb-4">
            <div>
              <p className="text-xs text-muted-foreground tracking-wider uppercase mb-2">Tipo de Vídeo</p>
              <p className="text-foreground">{request.video_type}</p>
            </div>
            {request.brand && (
              <div>
                <p className="text-xs text-muted-foreground tracking-wider uppercase mb-2">Marca</p>
                <p className="text-foreground">{request.brand}</p>
              </div>
            )}
          </div>

          {/* Platform and Format */}
          {(request.platform || request.format) && (
            <div className="grid grid-cols-2 gap-4 border-b border-border pb-4">
              {request.platform && (
                <div>
                  <p className="text-xs text-muted-foreground tracking-wider uppercase mb-2 flex items-center gap-1">
                    <Smartphone size={12} />
                    Plataforma
                  </p>
                  <p className="text-foreground">{request.platform}</p>
                </div>
              )}
              {request.format && (
                <div>
                  <p className="text-xs text-muted-foreground tracking-wider uppercase mb-2 flex items-center gap-1">
                    <MonitorPlay size={12} />
                    Formato
                  </p>
                  <p className="text-foreground">{request.format}</p>
                </div>
              )}
            </div>
          )}

          {/* Orientation and Deadline */}
          <div className="grid grid-cols-2 gap-4 border-b border-border pb-4">
            {request.orientation && (
              <div>
                <p className="text-xs text-muted-foreground tracking-wider uppercase mb-2">Orientação</p>
                <p className="text-foreground capitalize">{request.orientation}</p>
              </div>
            )}
            {request.deadline && (
              <div>
                <p className="text-xs text-muted-foreground tracking-wider uppercase mb-2 flex items-center gap-1">
                  <Calendar size={12} />
                  Prazo
                </p>
                <p className="text-foreground">
                  {format(new Date(request.deadline), "dd 'de' MMMM", { locale: ptBR })}
                </p>
              </div>
            )}
          </div>

          {/* Description */}
          {request.description && (
            <div className="border-b border-border pb-4">
              <p className="text-xs text-muted-foreground tracking-wider uppercase mb-2 flex items-center gap-1">
                <MessageSquare size={12} />
                Descrição
              </p>
              <p className="text-foreground text-sm whitespace-pre-wrap">{request.description}</p>
            </div>
          )}

          {/* Assigned Team */}
          {request.assigned_names && request.assigned_names.length > 0 && (
            <div className="border-b border-border pb-4">
              <p className="text-xs text-muted-foreground tracking-wider uppercase mb-2 flex items-center gap-1">
                <User size={12} />
                {request.status === "completed" ? "Produzido por" : "Responsável"}
              </p>
              <p className="text-foreground">{request.assigned_names.join(", ")}</p>
            </div>
          )}

          {/* Progress */}
          {(request.status === "progress" || request.status === "alteration" || request.status === "review") && (
            <div className="border-b border-border pb-4">
              <ProgressBar
                value={request.progress ?? 0}
                label="Progresso da Missão"
                size="md"
              />
            </div>
          )}

          {/* Notes */}
          <div className="border-b border-border pb-4">
            <MissionNotes
              notes={request.notes || []}
              canAdd={!!onAddNote}
              onAdd={onAddNote ? (text) => onAddNote(request.id, text) : undefined}
              compact
            />
          </div>

          {/* Drive Link */}
          {request.drive_url && (
            <div className="border-b border-border pb-4">
              <p className="text-xs text-muted-foreground tracking-wider uppercase mb-3 flex items-center gap-1">
                <Link size={12} />
                Link de Materiais (Drive/Externo)
              </p>
              <a
                href={request.drive_url.startsWith('http') ? request.drive_url : `https://${request.drive_url}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-sm text-accent hover:bg-accent/5 p-3 border border-accent/20 transition-colors bg-accent/5"
              >
                <ExternalLink size={16} className="shrink-0" />
                <span className="flex-1 truncate font-medium">Acessar Pasta de Materiais</span>
              </a>
            </div>
          )}

          {/* Attachments */}
          {request.attachments && request.attachments.length > 0 && (
            <div className="border-b border-border pb-4">
              <p className="text-xs text-muted-foreground tracking-wider uppercase mb-3 flex items-center gap-1">
                <FileText size={12} />
                Anexos Enviados
              </p>
              <div className="space-y-2">
                {request.attachments.map((file, idx) => (
                  <a
                    key={idx}
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-sm text-foreground hover:bg-muted p-2 border border-border transition-colors"
                  >
                    <FileText size={14} className="text-muted-foreground shrink-0" />
                    <span className="flex-1 truncate">{file.name}</span>
                    <Download size={12} className="text-muted-foreground shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Deliverables (for completed requests) */}
          {request.status === "completed" && request.deliverables && (request.deliverables as AttachmentFile[]).length > 0 && (
            <div className="border border-foreground p-4">
              <p className="text-xs font-medium text-foreground tracking-wider uppercase mb-4 flex items-center gap-2">
                <Download size={14} />
                Material Entregue
              </p>
              <div className="space-y-2">
                {(request.deliverables as AttachmentFile[]).map((file, idx) => (
                  <a
                    key={idx}
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 text-sm text-foreground hover:bg-muted p-3 border border-border transition-colors"
                  >
                    <FileText size={16} className="text-muted-foreground" />
                    <span className="flex-1 truncate">{file.name}</span>
                    <Download size={14} className="text-muted-foreground" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Footer info */}
          <div className="text-xs text-muted-foreground pt-2">
            <p>Criado em {format(new Date(request.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
          </div>

          {/* Actions */}
          <div className="pt-6 flex gap-3">
            {canRequestAlteration && !showAlterationWarning && (
              <RetroButton
                variant="outline"
                className="flex-1"
                onClick={handleRequestAlteration}
              >
                <RotateCcw size={14} className="mr-2" />
                Solicitar Alteração
              </RetroButton>
            )}
            <RetroButton
              variant="primary"
              className="flex-1"
              onClick={onClose}
            >
              {request.status === "completed" ? "Entendido" : "Fechar"}
            </RetroButton>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
