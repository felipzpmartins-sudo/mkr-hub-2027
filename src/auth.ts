import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { loginSchema } from "@/lib/validation";
import { hashPassword, verifyPassword } from "@/lib/password";
import { requestIp, trustedIp } from "@/lib/request";
import { consumeLoginAttempt } from "@/services/login-limiter";

// Equal-cost verification for unknown accounts; generated in memory, never a credential.
let dummyHash: Promise<string> | undefined;
export const { handlers, auth, signIn, signOut } = NextAuth({
  pages: { signIn: "/login", error: "/login" },
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  providers: [
    Credentials({
      credentials: { email: { type: "email" }, password: { type: "password" } },
      async authorize(credentials, request) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;
        const ipAddress = trustedIp(request.headers);
        const allowed = await consumeLoginAttempt(email, ipAddress);
        const user = await db.user.findUnique({ where: { email } });
        dummyHash ??= hashPassword(randomBytes(32).toString("hex"));
        const valid =
          allowed && (await verifyPassword(password, user?.passwordHash ?? (await dummyHash)));
        if (!valid || !user || user.status !== "ACTIVE") {
          await db.auditLog.create({
            data: {
              userId: user?.id,
              action: "LOGIN_FAILED",
              target: "authentication",
              ipAddress,
              metadata: { reason: allowed ? "invalid_credentials" : "rate_limited" },
            },
          });
          return null;
        }
        await db.auditLog.create({
          data: { userId: user.id, action: "LOGIN", target: user.id, ipAddress },
        });
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          sessionVersion: user.sessionVersion,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.sessionVersion = user.sessionVersion;
      }
      if (!token.sub) return null;
      const current = await db.user.findUnique({
        where: { id: token.sub },
        select: { status: true, sessionVersion: true },
      });
      if (
        !current ||
        current.status !== "ACTIVE" ||
        current.sessionVersion !== token.sessionVersion
      )
        return null;
      return token;
    },
    session({ session, token }) {
      session.user.id = token.sub!;
      session.user.sessionVersion = token.sessionVersion!;
      return session;
    },
  },
  events: {
    async signOut(message) {
      if ("token" in message && message.token?.sub) {
        await db.$transaction([
          db.user.update({
            where: { id: message.token.sub },
            data: { sessionVersion: { increment: 1 } },
          }),
          db.auditLog.create({
            data: {
              userId: message.token.sub,
              action: "LOGOUT",
              target: message.token.sub,
              ipAddress: await requestIp(),
            },
          }),
        ]);
      }
    },
  },
});
