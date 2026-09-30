export function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  }).format(date);
}
export const actionLabels: Record<string, string> = {
  LOGIN: "Login realizado",
  LOGIN_FAILED: "Tentativa de login",
  LOGOUT: "Sessão encerrada",
  USER_CREATED: "Usuário criado",
  USER_UPDATED: "Usuário atualizado",
  USER_DISABLED: "Usuário desativado",
  ACCESS_GRANTED: "Acesso concedido",
  ACCESS_REVOKED: "Acesso revogado",
  ACCESS_UPDATED: "Permissão atualizada",
  SYSTEM_CREATED: "Sistema criado",
  SYSTEM_UPDATED: "Sistema atualizado",
  SYSTEM_ACCESSED: "Sistema acessado",
  PASSWORD_CHANGED: "Senha alterada",
};
export function pageNumber(value?: string) {
  const num = Number(value);
  return Number.isSafeInteger(num) && num > 0 ? Math.min(num, 10000) : 1;
}
