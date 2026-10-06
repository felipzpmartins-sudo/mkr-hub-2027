const tokenKey = "central-videos-token";
const userKey = "central-videos-user";

export type ApiUser = { id: string; name: string; email: string; role: "solicitante" | "capitao" | "tripulante"; crew_key?: string };

export function getToken() { return localStorage.getItem(tokenKey); }
export function getStoredUser(): ApiUser | null { const raw = localStorage.getItem(userKey); return raw ? JSON.parse(raw) : null; }
export function setSession(token: string, user: ApiUser) { localStorage.setItem(tokenKey, token); localStorage.setItem(userKey, JSON.stringify(user)); }
export function clearSession() { localStorage.removeItem(tokenKey); localStorage.removeItem(userKey); }

async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const response = await fetch(url, { ...init, headers: { ...(init.body instanceof FormData ? {} : { "Content-Type": "application/json" }), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers } });
  if (!response.ok) { const body = await response.json().catch(() => ({})); throw new Error(body.message || "Não foi possível concluir a operação."); }
  return response.status === 204 ? undefined as T : response.json();
}

export const api = {
  login: (email: string, password: string) => request<{ token: string; user: ApiUser }>("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  register: (name: string, email: string, password: string) => request<{ token: string; user: ApiUser }>("/api/auth/register", { method: "POST", body: JSON.stringify({ name, email, password }) }),
  crewLogin: (crewKey: string, password: string) => request<{ token: string; user: ApiUser }>("/api/auth/crew", { method: "POST", body: JSON.stringify({ crewKey, password }) }),
  me: () => request<{ user: ApiUser }>("/api/auth/me"),
  requests: () => request<any[]>("/api/requests"),
  createRequest: (body: unknown) => request<any>("/api/requests", { method: "POST", body: JSON.stringify(body) }),
  updateRequest: (id: string, body: unknown) => request<any>(`/api/requests/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteRequest: (id: string) => request<void>(`/api/requests/${id}`, { method: "DELETE" }),
  crew: () => request<any[]>("/api/crew"),
  upload: (files: File[]) => { const form = new FormData(); files.forEach((file) => form.append("files", file)); return request<any[]>("/api/uploads", { method: "POST", body: form }); },
};
