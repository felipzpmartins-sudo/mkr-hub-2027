import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLabAuth } from "@/contexts/LabAuthContext";

const roleLabels: Record<string, string> = {
  admin: "Administrador",
  requisition_approver: "Aprovador",
  stock: "Estoque",
  user: "Usuário",
};

/**
 * The lab dashboard deliberately stops at identity display. Business screens
 * still use the legacy Supabase integration and are not opened from here.
 */
const Index = () => {
  const { user, loading, logout } = useLabAuth();

  const handleLogout = async () => {
    await logout();
  };

  if (loading || !user) {
    return <div className="min-h-screen bg-background" aria-label="Verificando sessão" />;
  }

  const displayName = user.profile?.fullName || user.fullName || user.email;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-5xl py-8 px-4">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Central de Compras Interna</h1>
            <p className="text-muted-foreground text-lg">
              Laboratório local de autenticação e autorização
            </p>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </div>

        <section className="rounded-lg border bg-card p-6 shadow-sm">
          <p className="text-sm text-muted-foreground">Sessão autenticada no backend próprio</p>
          <h2 className="mt-1 text-2xl font-semibold">Olá, {displayName}</h2>
          <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">E-mail</dt>
              <dd className="font-medium">{user.email}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Status</dt>
              <dd className="font-medium">{user.status}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Departamento</dt>
              <dd className="font-medium">{user.profile?.department || "Não informado"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Papéis</dt>
              <dd className="mt-1 flex flex-wrap gap-2">
                {user.roles.length > 0 ? user.roles.map((role) => (
                  <Badge key={role} variant="secondary">{roleLabels[role] || role}</Badge>
                )) : <span>Nenhum papel atribuído</span>}
              </dd>
            </div>
          </dl>
        </section>

        <section className="mt-6 rounded-lg border border-amber-500/30 bg-amber-500/5 p-5 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Módulos de negócio permanecem isolados.</p>
          <p className="mt-1">
            Solicitações, aprovações, estoque, anexos e notificações ainda usam a integração legada e não são abertos neste laboratório. A próxima etapa poderá conectá-los aos endpoints locais, um módulo por vez.
          </p>
        </section>
      </div>
    </div>
  );
};

export default Index;
