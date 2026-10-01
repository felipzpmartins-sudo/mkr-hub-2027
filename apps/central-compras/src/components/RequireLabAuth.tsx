import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useLabAuth } from "@/contexts/LabAuthContext";

export function RequireLabAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useLabAuth();

  if (loading) {
    return <div className="min-h-screen bg-background" aria-label="Verificando sessão" />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}
