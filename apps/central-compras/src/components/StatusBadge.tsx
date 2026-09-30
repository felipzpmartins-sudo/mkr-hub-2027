import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type RequestStatus = "pending" | "approved" | "rejected" | "purchasing" | "delivered";

type ApprovalStatus = "pending_quotes" | "pending_approval" | "approved_partial" | "approved_released" | "rejected" | "delivered";

const statusConfig: Record<RequestStatus, { label: string; className: string }> = {
  pending: {
    label: "Pendente",
    className: "bg-status-pending text-status-pending-foreground hover:bg-status-pending/80",
  },
  approved: {
    label: "Aprovado",
    className: "bg-status-approved text-status-approved-foreground hover:bg-status-approved/80",
  },
  rejected: {
    label: "Reprovado",
    className: "bg-status-rejected text-status-rejected-foreground hover:bg-status-rejected/80",
  },
  purchasing: {
    label: "Em Compra",
    className: "bg-status-purchasing text-status-purchasing-foreground hover:bg-status-purchasing/80",
  },
  delivered: {
    label: "Entregue",
    className: "bg-status-delivered text-status-delivered-foreground hover:bg-status-delivered/80",
  },
};

const approvalStatusConfig: Record<ApprovalStatus, { label: string; className: string }> = {
  pending_quotes: {
    label: "Aguardando Orçamentos",
    className: "bg-amber-100 text-amber-800 hover:bg-amber-100/80",
  },
  pending_approval: {
    label: "Aguardando Aprovação",
    className: "bg-blue-100 text-blue-800 hover:bg-blue-100/80",
  },
  approved_partial: {
    label: "Aprovado por 1",
    className: "bg-sky-100 text-sky-800 hover:bg-sky-100/80",
  },
  approved_released: {
    label: "Liberado para Compra",
    className: "bg-status-approved text-status-approved-foreground hover:bg-status-approved/80",
  },
  rejected: {
    label: "Rejeitado",
    className: "bg-status-rejected text-status-rejected-foreground hover:bg-status-rejected/80",
  },
  delivered: {
    label: "Entregue",
    className: "bg-status-delivered text-status-delivered-foreground hover:bg-status-delivered/80",
  },
};

interface StatusBadgeProps {
  status: RequestStatus;
  className?: string;
}

export const StatusBadge = ({ status, className }: StatusBadgeProps) => {
  const config = statusConfig[status];
  
  return (
    <Badge className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
};

interface ApprovalStatusBadgeProps {
  status: string | null;
  className?: string;
}

export const ApprovalStatusBadge = ({ status, className }: ApprovalStatusBadgeProps) => {
  const config = approvalStatusConfig[(status as ApprovalStatus) || 'pending_quotes'];
  
  if (!config) {
    return (
      <Badge className={cn("bg-gray-100 text-gray-800", className)}>
        {status || "—"}
      </Badge>
    );
  }
  
  return (
    <Badge className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
};

interface RequesterStatusBadgeProps {
  status: RequestStatus;
  approvalStatus?: string | null;
  requestType?: string | null;
  className?: string;
}

const requesterApprovalLabels: Record<string, { label: string; className: string }> = {
  pending_quotes: {
    label: "Orçamento em andamento",
    className: "bg-amber-100 text-amber-800 hover:bg-amber-100/80",
  },
  pending_approval: {
    label: "Aguardando Aprovação",
    className: "bg-blue-100 text-blue-800 hover:bg-blue-100/80",
  },
  approved_partial: {
    label: "Aguardando Aprovação",
    className: "bg-blue-100 text-blue-800 hover:bg-blue-100/80",
  },
};

/** Badge exibido para o solicitante: reflete a etapa de aprovação enquanto o pedido está pendente. */
export const RequesterStatusBadge = ({ status, approvalStatus, requestType, className }: RequesterStatusBadgeProps) => {
  // Apostilas não passam por orçamento — o admin apenas confirma o recebimento
  if (status === "pending" && requestType === "apostilas" && approvalStatus === "pending_quotes") {
    return (
      <Badge className={cn("bg-blue-100 text-blue-800 hover:bg-blue-100/80", className)}>
        Aguardando Confirmação
      </Badge>
    );
  }

  const approvalConfig = approvalStatus ? requesterApprovalLabels[approvalStatus] : undefined;

  if (status === "pending" && approvalConfig) {
    return (
      <Badge className={cn(approvalConfig.className, className)}>
        {approvalConfig.label}
      </Badge>
    );
  }

  return <StatusBadge status={status} className={className} />;
};
