import { createHash } from "node:crypto";
import { db } from "@/lib/db";

export async function consumeLoginAttempt(email: string, ip: string | null) {
  const keys = [
    { source: `email:${email}`, limit: 8 },
    ...(ip ? [{ source: `ip:${ip}`, limit: 60 }] : []),
  ];
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 15 * 60_000);
  const counts = await db.$transaction(async (tx) => {
    await tx.loginAttempt.deleteMany({ where: { expiresAt: { lt: now } } });
    return Promise.all(
      keys.map(async (item) => {
        const key = createHash("sha256").update(item.source).digest("hex");
        const row = await tx.loginAttempt.upsert({
          where: { key },
          create: { key, expiresAt },
          update: { count: { increment: 1 } },
        });
        return row.count <= item.limit;
      }),
    );
  });
  return counts.every(Boolean);
}
