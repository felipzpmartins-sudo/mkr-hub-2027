import { useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { RetroButton } from "@/components/RetroButton";
import { clearSession } from "@/lib/api";

interface LogoutButtonProps {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

/**
 * Botão de sair confiável:
 * - encerra a sessão local (não depende da rede para funcionar)
 * - remove apenas as chaves de autenticação (não apaga preferências do app)
 * - sempre redireciona, mesmo se a chamada falhar ou demorar
 */
export function LogoutButton({
  variant = "danger",
  size = "sm",
  showLabel = true,
  className,
}: LogoutButtonProps) {
  const [loading, setLoading] = useState(false);

  const clearAuthStorage = () => {
    try {
      clearSession();
    } catch {
      /* storage indisponível — segue o fluxo */
    }
  };

  const handleLogout = async () => {
    if (loading) return;
    setLoading(true);

    try {
      // scope local encerra só este navegador e não trava se a API estiver lenta
      clearSession();
    } catch {
      /* ignora: a limpeza abaixo garante o logout */
    }

    clearAuthStorage();
    window.location.replace(import.meta.env.VITE_MKR_HUB_URL?.trim() || "http://localhost:3000/dashboard");
  };

  return (
    <RetroButton
      variant={variant}
      size={size}
      onClick={handleLogout}
      disabled={loading}
      className={className}
    >
      {loading ? (
        <Loader2 size={16} className={showLabel ? "mr-2 animate-spin" : "animate-spin"} />
      ) : (
        <ArrowLeft size={16} className={showLabel ? "mr-2" : undefined} />
      )}
      {showLabel && (loading ? "Voltando..." : "Voltar ao MKR HUB")}
    </RetroButton>
  );
}
