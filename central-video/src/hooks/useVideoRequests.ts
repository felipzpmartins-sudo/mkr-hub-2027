import { useCallback, useEffect, useState } from "react";
import { api, getToken } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export interface AttachmentFile { name: string; size: number; url: string; path: string; }
export interface MissionNote { id: string; author_name: string; author_role: string; text: string; created_at: string; }
export interface VideoRequest {
  id: string; title: string; description: string | null; video_type: string; brand: string | null; platform: string | null; format: string | null; orientation: string | null; deadline: string | null;
  status: "new" | "progress" | "alteration" | "review" | "completed" | "rejected"; requester_id: string | null; requester_name: string; assigned_to: string[]; assigned_names: string[];
  attachments: AttachmentFile[]; deliverables: AttachmentFile[]; notes: MissionNote[]; progress: number; whatsapp: string | null; drive_url: string | null; created_at: string; updated_at: string;
}
export interface CrewMember { id: string; name: string; role: string; crew_key?: string; }

export function useVideoRequests() {
  const [requests, setRequests] = useState<VideoRequest[]>([]); const [loading, setLoading] = useState(true); const { toast } = useToast();
  const fetchRequests = useCallback(async () => {
    if (!getToken()) { setRequests([]); setLoading(false); return; }
    setLoading(true); try { setRequests(await api.requests()); } catch (error) { toast({ title: "Não foi possível carregar as solicitações", description: error instanceof Error ? error.message : "Tente novamente.", variant: "destructive" }); } finally { setLoading(false); }
  }, [toast]);
  useEffect(() => { fetchRequests(); }, [fetchRequests]);
  const mutate = async (work: () => Promise<unknown>, success: string) => { try { const value = await work(); await fetchRequests(); toast({ title: success }); return value; } catch (error) { toast({ title: "Erro", description: error instanceof Error ? error.message : "Tente novamente.", variant: "destructive" }); return null; } };
  const createRequest = (request: any) => mutate(() => api.createRequest(request), "Solicitação enviada!");
  const delegateRequest = (id: string, member: CrewMember) => { const request = requests.find((item) => item.id === id); if (!request) return Promise.resolve(null); return mutate(() => api.updateRequest(id, { assigned_to: [...request.assigned_to, member.id], assigned_names: [...request.assigned_names, member.name], status: "progress" }), `Missão delegada para ${member.name}.`); };
  const updateStatus = (id: string, status: VideoRequest["status"]) => mutate(() => api.updateRequest(id, { status }), "Status atualizado!");
  const deleteRequest = (id: string) => mutate(() => api.deleteRequest(id), "Solicitação excluída!");
  const updateProgress = (id: string, progress: number) => mutate(() => api.updateRequest(id, { progress: Math.max(0, Math.min(100, Math.round(progress))) }), "Progresso atualizado!");
  const addNote = (id: string, note: Omit<MissionNote, "id" | "created_at">) => { const request = requests.find((item) => item.id === id); if (!request || !note.text.trim()) return Promise.resolve(false); const next = [...(request.notes || []), { ...note, id: crypto.randomUUID(), created_at: new Date().toISOString() }]; return mutate(() => api.updateRequest(id, { notes: next }), "Observação salva!").then(Boolean); };
  const openWhatsAppNotification = (request: VideoRequest) => { const phone = request.whatsapp?.replace(/\D/g, ""); if (phone) window.open(`https://wa.me/${phone.startsWith("55") ? phone : `55${phone}`}`, "_blank"); };
  return { requests, loading, createRequest, delegateRequest, updateStatus, deleteRequest, updateProgress, addNote, openWhatsAppNotification, refetch: fetchRequests };
}

export function useCrewMembers() {
  const [crew, setCrew] = useState<CrewMember[]>([]); const [loading, setLoading] = useState(true);
  useEffect(() => { if (!getToken()) { setLoading(false); return; } api.crew().then(setCrew).catch(() => setCrew([])).finally(() => setLoading(false)); }, []);
  return { crew, loading };
}
