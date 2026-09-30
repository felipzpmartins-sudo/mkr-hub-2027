import { requireAdmin } from "@/services/authorization";
import { BackLink, PageHeading } from "@/components/ui";
import { SystemForm } from "@/components/system-form";
export default async function NewSystemPage() {
  await requireAdmin();
  return (
    <>
      <BackLink href="/admin/systems">Sistemas</BackLink>
      <PageHeading
        title="Novo sistema"
        description="Adicione uma aplicação ao ecossistema da empresa."
      />
      <SystemForm />
    </>
  );
}
