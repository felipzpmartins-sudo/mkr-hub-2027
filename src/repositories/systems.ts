import { db } from "@/lib/db";

export function findUserSystems(userId: string, search = "") {
  return db.userSystemAccess.findMany({
    where: {
      userId,
      enabled: true,
      system: search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
            ],
          }
        : undefined,
    },
    include: { system: true },
    orderBy: { system: { createdAt: "asc" } },
  });
}

/** The HUB is a catalog: every signed-in person can discover every registered system. */
export async function findWorkspaceSystems(userId: string, search = "") {
  const systemFilter = search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { description: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const [systems, accesses] = await Promise.all([
    db.system.findMany({ where: systemFilter, orderBy: { createdAt: "asc" } }),
    db.userSystemAccess.findMany({ where: { userId } }),
  ]);
  const accessBySystem = new Map(accesses.map((access) => [access.systemId, access]));
  return systems.map((system) => ({ system, access: accessBySystem.get(system.id) ?? null }));
}
