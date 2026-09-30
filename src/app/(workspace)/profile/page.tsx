import { requireUser } from "@/services/authorization";
import { Avatar, Badge, PageHeading } from "@/components/ui";
import { PasswordForm } from "@/components/password-form";
import { formatDate } from "@/lib/format";
export const metadata = { title: "Meu perfil" };
export default async function ProfilePage() {
  const user = await requireUser();
  return (
    <>
      <PageHeading
        eyebrow="MINHA CONTA"
        title="Meu perfil"
        description="Sua identidade no workspace. Gerencie a segurança do seu acesso."
      />
      <section className="panel profile-panel">
        <div className="profile-identity">
          <Avatar name={user.name} large />
          <div>
            <h2>{user.name}</h2>
            <p>{user.email}</p>
            <Badge value={user.hubRole} />
          </div>
        </div>
        <dl className="details-grid">
          <div>
            <dt>Departamento</dt>
            <dd>{user.department || "Não informado"}</dd>
          </div>
          <div>
            <dt>Cargo</dt>
            <dd>{user.jobTitle || "Não informado"}</dd>
          </div>
          <div>
            <dt>Status</dt>
            <dd>
              <Badge value={user.status} />
            </dd>
          </div>
          <div>
            <dt>Membro desde</dt>
            <dd>{formatDate(user.createdAt)}</dd>
          </div>
        </dl>
        <p className="page-note">
          Para alterar seus dados pessoais ou permissões, entre em contato com um administrador.
        </p>
      </section>
      <PasswordForm />
    </>
  );
}
