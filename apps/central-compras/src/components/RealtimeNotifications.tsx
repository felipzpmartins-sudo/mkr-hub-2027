import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CheckCircle, XCircle, Clock, Package, Truck } from "lucide-react";
import { formatDateOnly } from "@/lib/utils";

interface RealtimeNotificationsProps {
  userId: string;
}

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  approved: "Aprovado",
  rejected: "Reprovado",
  purchasing: "Em Compra",
  delivered: "Entregue",
};

const statusIcons: Record<string, any> = {
  pending: Clock,
  approved: CheckCircle,
  rejected: XCircle,
  purchasing: Package,
  delivered: Truck,
};

export const RealtimeNotifications = ({ userId }: RealtimeNotificationsProps) => {
  const isInitialMount = useRef(true);

  useEffect(() => {
    console.log('Setting up realtime notifications for user:', userId);

    const channel = supabase
      .channel('solicitations-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'solicitations',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          // Skip notifications on initial mount to avoid showing old updates
          if (isInitialMount.current) {
            return;
          }

          console.log('Solicitation updated:', payload);
          
          const newData = payload.new as any;
          const oldData = payload.old as any;

          // Check if status changed
          if (newData.status !== oldData.status) {
            const StatusIcon = statusIcons[newData.status] || Clock;
            const statusLabel = statusLabels[newData.status];

            let message = `Status atualizado para: ${statusLabel}`;
            
            if (newData.admin_justification) {
              message += `\n${newData.admin_justification}`;
            }

            if (newData.estimated_arrival_date && (newData.status === 'approved' || newData.status === 'purchasing')) {
              const date = formatDateOnly(newData.estimated_arrival_date);
              message += `\nPrevisão de entrega: ${date}`;
            }

            if (newData.actual_delivery_date && newData.status === 'delivered') {
              const date = formatDateOnly(newData.actual_delivery_date);
              message += `\nEntregue em: ${date}`;
            }

            toast(message, {
              icon: <StatusIcon className="h-5 w-5" />,
              duration: 8000,
              description: `Solicitação #${newData.id.slice(0, 8)}`,
            });
          }
          // Check if estimated arrival date was added/updated
          else if (newData.estimated_arrival_date !== oldData.estimated_arrival_date && newData.estimated_arrival_date) {
            const date = formatDateOnly(newData.estimated_arrival_date);
            toast(`Previsão de entrega atualizada: ${date}`, {
              icon: <Clock className="h-5 w-5" />,
              duration: 6000,
              description: `Solicitação #${newData.id.slice(0, 8)}`,
            });
          }
          // Check if actual delivery date was added
          else if (newData.actual_delivery_date !== oldData.actual_delivery_date && newData.actual_delivery_date) {
            const date = formatDateOnly(newData.actual_delivery_date);
            toast(`Seu pedido foi entregue em: ${date}`, {
              icon: <Truck className="h-5 w-5" />,
              duration: 6000,
              description: `Solicitação #${newData.id.slice(0, 8)}`,
            });
          }
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
        
        // After subscription is ready, mark as no longer initial mount
        if (status === 'SUBSCRIBED') {
          setTimeout(() => {
            isInitialMount.current = false;
          }, 1000);
        }
      });

    return () => {
      console.log('Cleaning up realtime notifications');
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return null;
};
