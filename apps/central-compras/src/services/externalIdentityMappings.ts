import { supabase } from "@/integrations/supabase/client";

// Tipos locais: a tabela ainda não existe no banco (migration pendente, não aplicada),
// portanto não está no arquivo de tipos gerado automaticamente.
export interface ExternalIdentityMapping {
  id: string;
  system_key: string;
  provider: string;
  issuer: string;
  subject: string;
  auth_user_id: string;
  external_email: string | null;
  external_name: string | null;
  status: "active" | "revoked";
  linked_by: string | null;
  linked_at: string;
  created_at: string;
  updated_at: string;
  metadata: Record<string, unknown>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const table = () => (supabase as any).from("external_identity_mappings");

export interface ExternalIdentityMappingInsert {
  id?: string;
  system_key?: string;
  provider: string;
  issuer: string;
  subject: string;
  auth_user_id: string;
  external_email?: string | null;
  external_name?: string | null;
  status?: "active" | "revoked";
  linked_by?: string | null;
  linked_at?: string;
  created_at?: string;
  updated_at?: string;
  metadata?: Record<string, unknown>;
}

export type ExternalIdentityMappingUpdate = Partial<ExternalIdentityMappingInsert>;

/** Alias mantido por compatibilidade. */
export type CreateExternalIdentityMappingInput = ExternalIdentityMappingInsert;

export interface IdentityUser {
  auth_user_id: string;
  full_name: string | null;
  email: string | null;
}

/** Nome/e-mail atuais via RPC restrita a admin (sem ler auth.users no cliente). */
export async function listIdentityUsers(): Promise<IdentityUser[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("list_identity_users");
  if (error) throw new Error(`Falha ao listar usuários: ${error.message ?? "erro desconhecido"}`);
  return (data ?? []) as IdentityUser[];
}

function fail(action: string, error: { message?: string } | null): never {
  throw new Error(`Falha ao ${action}: ${error?.message ?? "erro desconhecido"}`);
}

export async function getExternalIdentityMappings(): Promise<ExternalIdentityMapping[]> {
  const { data, error } = await table()
    .select("*")
    .order("linked_at", { ascending: false });
  if (error) fail("listar identidades externas", error);
  return (data ?? []) as ExternalIdentityMapping[];
}

export async function getExternalIdentityMappingByAuthUserId(
  authUserId: string,
): Promise<ExternalIdentityMapping[]> {
  if (!authUserId) throw new Error("authUserId é obrigatório.");
  const { data, error } = await table()
    .select("*")
    .eq("auth_user_id", authUserId)
    .order("linked_at", { ascending: false });
  if (error) fail("buscar identidades do usuário", error);
  return (data ?? []) as ExternalIdentityMapping[];
}

export async function createExternalIdentityMapping(
  input: ExternalIdentityMappingInsert,
): Promise<ExternalIdentityMapping> {
  const provider = input.provider?.trim();
  const issuer = input.issuer?.trim();
  const subject = input.subject?.trim();
  if (!input.auth_user_id || !provider || !issuer || !subject) {
    throw new Error("auth_user_id, provider, issuer e subject são obrigatórios.");
  }
  const { data: auth } = await supabase.auth.getUser();
  const { data, error } = await table()
    .insert({
      auth_user_id: input.auth_user_id,
      provider,
      issuer,
      subject,
      external_email: input.external_email?.trim() || null,
      external_name: input.external_name?.trim() || null,
      system_key: input.system_key ?? "central_compras",
      metadata: input.metadata ?? {},
      linked_by: auth.user?.id ?? null,
    })
    .select("*")
    .single();
  if (error) {
    if (error.code === "23505") {
      throw new Error("Já existe um vínculo com este provider, issuer e subject.");
    }
    fail("criar vínculo de identidade externa", error);
  }
  return data as ExternalIdentityMapping;
}

/** Revoga o vínculo (apenas altera status; nunca apaga). */
export async function revokeExternalIdentityMapping(id: string): Promise<ExternalIdentityMapping> {
  if (!id) throw new Error("id é obrigatório.");
  const { data, error } = await table()
    .update({ status: "revoked" })
    .eq("id", id)
    .select("*")
    .single();
  if (error) fail("revogar vínculo", error);
  return data as ExternalIdentityMapping;
}
