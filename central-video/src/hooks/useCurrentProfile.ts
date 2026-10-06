import { useEffect, useState } from "react";
import { api, getStoredUser, type ApiUser } from "@/lib/api";

export interface CurrentProfile { id: string; user_id: string; name: string; email: string; role: "solicitante" | "capitao" | "tripulante"; }

const asProfile = (user: ApiUser): CurrentProfile => ({ id: user.id, user_id: user.id, name: user.name, email: user.email, role: user.role });

export function useCurrentProfile() {
  const [profile, setProfile] = useState<CurrentProfile | null>(() => { const user = getStoredUser(); return user ? asProfile(user) : null; });
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const current = getStoredUser();
    if (!current) { setLoading(false); return; }
    api.me().then(({ user }) => setProfile(asProfile(user))).catch(() => setProfile(null)).finally(() => setLoading(false));
  }, []);
  return { profile, loading, refetch: async () => { const { user } = await api.me(); setProfile(asProfile(user)); } };
}
