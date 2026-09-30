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
