import { notFound } from "next/navigation";
import { requireAdmin } from "@/services/authorization";
import { db } from "@/lib/db";
import { BackLink, PageHeading } from "@/components/ui";
import { SystemForm } from "@/components/system-form";
export default async function SystemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const system = await db.system.findUnique({ where: { id } });
  if (!system) notFound();
  return (
    <>
      <BackLink href="/admin/systems">Sistemas</BackLink>
      <PageHeading
        title={system.name}
        description="Configure a disponibilidade e o destino dos acessos."
      />
      <SystemForm
        system={{
          id: system.id,
          name: system.name,
          slug: system.slug,
          description: system.description,
          url: system.url,
          status: system.status,
          icon: system.icon,
        }}
      />
    </>
  );
}
