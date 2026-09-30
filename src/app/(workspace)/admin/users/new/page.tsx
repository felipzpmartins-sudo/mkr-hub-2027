import { requireAdmin } from "@/services/authorization";
import { BackLink, PageHeading } from "@/components/ui";
import { UserForm } from "@/components/user-form";
export default async function NewUserPage() {
  await requireAdmin();
  return (
    <>
      <BackLink href="/admin/users">Usuários</BackLink>
      <PageHeading
        title="Novo usuário"
        description="Convide uma pessoa para o workspace com uma conta gerenciada."
      />
      <UserForm />
    </>
  );
}
