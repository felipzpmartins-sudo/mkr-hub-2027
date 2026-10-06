import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ArrowUpRight, User, Users } from "lucide-react";

export type MissionStatus = "new" | "progress" | "alteration" | "review" | "rejected" | "completed";

interface MissionCardProps {
  id: string;
  title: string;
  requester: string;
  videoType: string;
  status: MissionStatus;
  assignees?: string[];
  description?: string;
  createdAt: string;
  progress?: number;
  onClick?: () => void;
}

const statusConfig = {
  new: { label: "Novo", class: "bg-foreground/10 text-foreground border border-foreground/20" },
  progress: { label: "Em Andamento", class: "bg-muted text-foreground/70 border border-border" },
  alteration: { label: "Alteração", class: "bg-muted text-foreground/60 border border-border" },
  review: { label: "Aguardando", class: "bg-foreground/5 text-foreground/70 border border-foreground/10" },
  rejected: { label: "Recusado", class: "bg-destructive/10 text-destructive border border-destructive/20" },
  completed: { label: "Finalizado", class: "bg-foreground text-background" },
};

export function MissionCard({
  title,
  requester,
  videoType,
  status,
  assignees = [],
  description,
  createdAt,
  progress,
  onClick,
}: MissionCardProps) {
  const statusInfo = statusConfig[status];
  const showProgress = (status === "progress" || status === "alteration" || status === "review") && typeof progress === "number";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      onClick={onClick}
      className={cn(
        "group bg-card p-6 cursor-pointer",
        "border border-border hover:border-foreground/30",
        "transition-all duration-300",
        "relative overflow-hidden"
      )}
    >
      {/* Top row */}
      <div className="flex justify-between items-start mb-6">
        <span className={cn("px-3 py-1.5 text-xs font-medium tracking-wide", statusInfo.class)}>
          {statusInfo.label}
        </span>
        <span className="text-xs text-muted-foreground tracking-wider">{createdAt}</span>
      </div>

      {/* Title */}
      <h3 className="text-foreground font-medium text-lg mb-2 line-clamp-1 group-hover:text-foreground/80 transition-colors">
        {title}
      </h3>

      {/* Video type */}
      <p className="text-sm text-muted-foreground mb-4 tracking-wide uppercase">
        {videoType}
      </p>

      {/* Description preview */}
      {description && (
        <p className="text-sm text-muted-foreground/70 mb-6 line-clamp-2 leading-relaxed font-light">
          {description}
        </p>
      )}

      {/* Progress */}
      {showProgress && (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-muted-foreground tracking-wider uppercase">Progresso</span>
            <span className="text-xs font-medium text-foreground">{Math.min(100, Math.max(0, Math.round(progress!)))}%</span>
          </div>
          <div className="h-1 w-full bg-muted overflow-hidden">
            <div
              className="h-full bg-foreground transition-all"
              style={{ width: `${Math.min(100, Math.max(0, progress!))}%` }}
            />
          </div>
        </div>
      )}


      {/* Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div className="flex items-center gap-2">
          <User size={14} className="text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{requester}</span>
        </div>
        
        {assignees.length > 0 ? (
          <div className="flex items-center gap-2">
            <Users size={14} className="text-foreground/60" />
            <span className="text-sm text-foreground/60">
              {assignees.join(", ")}
            </span>
          </div>
        ) : (
          <ArrowUpRight size={16} className="text-muted-foreground group-hover:text-foreground transition-colors" />
        )}
      </div>
    </motion.div>
  );
}
