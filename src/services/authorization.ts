import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    omit: { passwordHash: true },
  });
  if (!user || user.status !== "ACTIVE" || user.sessionVersion !== session.user.sessionVersion)
    redirect("/login");
  return user;
}
export async function requireAdmin() {
  const user = await requireUser();
  if (user.hubRole !== "ADMIN") redirect("/forbidden");
  return user;
}
