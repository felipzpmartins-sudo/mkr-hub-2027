import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ApiClientError } from "@/lib/apiClient";
import { authApi, type LabUser } from "@/services/authApi";

type LabAuthContextValue = {
  user: LabUser | null;
  loading: boolean;
  refresh: () => Promise<LabUser | null>;
  login: (email: string, password: string) => Promise<LabUser>;
  logout: () => Promise<void>;
};

const LabAuthContext = createContext<LabAuthContextValue | null>(null);

export function LabAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LabUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { user: currentUser } = await authApi.me();
      setUser(currentUser);
      return currentUser;
    } catch (error) {
      if (!(error instanceof ApiClientError) || error.status !== 401) {
        console.error("Não foi possível verificar a sessão local da Central.", error);
      }
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    await authApi.login(email, password);
    const authenticatedUser = await refresh();

    if (!authenticatedUser) {
      throw new ApiClientError("Não foi possível carregar a sessão criada.", 401, "UNAUTHORIZED");
    }

    return authenticatedUser;
  }, [refresh]);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo(
    () => ({ user, loading, refresh, login, logout }),
    [user, loading, refresh, login, logout],
  );

  return <LabAuthContext.Provider value={value}>{children}</LabAuthContext.Provider>;
}

export function useLabAuth() {
  const context = useContext(LabAuthContext);
  if (!context) {
    throw new Error("useLabAuth must be used inside LabAuthProvider.");
  }
  return context;
}
