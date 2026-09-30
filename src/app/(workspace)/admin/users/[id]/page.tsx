import { notFound } from "next/navigation";
import { requireAdmin } from "@/services/authorization";
import { db } from "@/lib/db";
import { BackLink, PageHeading, EmptyState } from "@/components/ui";
import { UserForm } from "@/components/user-form";
import { AccessForm } from "@/components/access-form";
export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const [user, systems] = await Promise.all([
    db.user.findUnique({
      where: { id },
      omit: { passwordHash: true },
      include: { accesses: true },
    }),
    db.system.findMany({ orderBy: { createdAt: "asc" } }),
  ]);
  if (!user) notFound();
  return (
    <>
      <BackLink href="/admin/users">Usuários</BackLink>
      <PageHeading
        title={user.name}
        description="Gerencie os dados e as permissões desta identidade central."
      />
      <UserForm
        user={{
          id: user.id,
          name: user.name,
          email: user.email,
          department: user.department,
          jobTitle: user.jobTitle,
          hubRole: user.hubRole,
          status: user.status,
        }}
      />
      <div className="section-heading" id="access">
        <div>
          <p className="eyebrow">ACESSO AOS SISTEMAS</p>
          <h2>Permissões e contas vinculadas</h2>
          <p>Defina um perfil por aplicação e preserve a ligação com as contas existentes.</p>
        </div>
      </div>
      <div className="access-list">
        {systems.map((system) => {
          const access = user.accesses.find((a) => a.systemId === system.id);
          return (
            <AccessForm
              key={system.id}
              userId={user.id}
              system={{ id: system.id, name: system.name, slug: system.slug }}
              access={
                access
                  ? {
                      enabled: access.enabled,
                      role: access.role,
                      externalUserEmail: access.externalUserEmail,
                      externalUserId: access.externalUserId,
                      externalDisplayName: access.externalDisplayName,
                      externalProvider: access.externalProvider,
                      externalIssuer: access.externalIssuer,
                      externalSubject: access.externalSubject,
                      status: access.status,
                      linkedAt: access.linkedAt,
                    }
                  : undefined
              }
            />
          );
        })}
      </div>
      {!systems.length && (
        <EmptyState
          title="Nenhum sistema cadastrado"
          description="Execute o seed ou cadastre um sistema para liberar acessos."
        />
      )}
    </>
  );
}
