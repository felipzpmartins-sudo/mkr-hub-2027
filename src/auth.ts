import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { loginSchema } from "@/lib/validation";
import { hashPassword, verifyPassword } from "@/lib/password";
import { requestIp, trustedIp } from "@/lib/request";
import {
  provisionCentralPurchasesUser,
  provisionCentralMarketingUser,
  provisionMakerWalletUser,
  provisionCentralVideoUser,
  signInToCentralMarketing,
  signInToCentralPurchases,
  signInToMakerWallet,
  signInToCentralVideo,
} from "@/services/central-purchases";
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
        const centralIdentity = allowed ? await signInToCentralPurchases(email, password) : null;
        const marketingIdentity = allowed ? await signInToCentralMarketing(email, password) : null;
        const makerWalletIdentity = allowed ? await signInToMakerWallet(email, password) : null;
        const centralVideoIdentity = allowed ? await signInToCentralVideo(email, password) : null;
        const centralUser = centralIdentity
          ? await provisionCentralPurchasesUser(centralIdentity)
          : null;
        const marketingUser = marketingIdentity
          ? await provisionCentralMarketingUser(marketingIdentity)
          : null;
        const makerWalletUser = makerWalletIdentity
          ? await provisionMakerWalletUser(makerWalletIdentity)
          : null;
        const centralVideoUser = centralVideoIdentity
          ? await provisionCentralVideoUser(centralVideoIdentity)
          : null;
        const user =
          centralUser ??
          marketingUser ??
          makerWalletUser ??
          centralVideoUser ??
          (await db.user.findUnique({ where: { email } }));
        dummyHash ??= hashPassword(randomBytes(32).toString("hex"));
        const valid =
          allowed &&
          (centralUser || marketingUser || makerWalletUser || centralVideoUser
            ? true
            : await verifyPassword(password, user?.passwordHash ?? (await dummyHash)));
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
          centralPurchasesSession: centralIdentity
            ? {
                accessToken: centralIdentity.accessToken,
                refreshToken: centralIdentity.refreshToken,
              }
            : undefined,
          centralMarketingSession: marketingIdentity
            ? {
                accessToken: marketingIdentity.accessToken,
                refreshToken: marketingIdentity.refreshToken,
              }
            : undefined,
          makerWalletSession: makerWalletIdentity
            ? { accessToken: makerWalletIdentity.accessToken }
            : undefined,
          centralVideoSession: centralVideoIdentity
            ? { accessToken: centralVideoIdentity.accessToken }
            : undefined,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.sessionVersion = user.sessionVersion;
        token.centralPurchasesSession = user.centralPurchasesSession;
        token.centralMarketingSession = user.centralMarketingSession;
        token.makerWalletSession = user.makerWalletSession;
        token.centralVideoSession = user.centralVideoSession;
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
      session.user.centralPurchasesSession = token.centralPurchasesSession;
      session.user.centralMarketingSession = token.centralMarketingSession;
      session.user.makerWalletSession = token.makerWalletSession;
      session.user.centralVideoSession = token.centralVideoSession;
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
