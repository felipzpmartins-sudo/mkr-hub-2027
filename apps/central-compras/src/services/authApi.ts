import { apiClient } from "@/lib/apiClient";

export type LabProfile = {
  fullName: string | null;
  phone: string | null;
  department: string | null;
} | null;

export type LabUser = {
  id: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  status: string;
  mustResetPassword: boolean;
  profile: LabProfile;
  roles: string[];
};

type AuthResponse = { user: LabUser };

export const authApi = {
  login(email: string, password: string) {
    return apiClient<AuthResponse>("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
    });
  },
  me() {
    return apiClient<AuthResponse>("/auth/me");
  },
  logout() {
    return apiClient<void>("/auth/logout", { method: "POST" });
  },
  profileMe() {
    return apiClient<AuthResponse>("/profile/me");
  },
};
