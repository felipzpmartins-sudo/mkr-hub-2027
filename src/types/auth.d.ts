import type { DefaultSession } from "next-auth";

interface CentralPurchasesSession {
  accessToken: string;
  refreshToken: string;
}

interface CentralMarketingSession extends CentralPurchasesSession {}
interface MakerWalletSession {
  accessToken: string;
}
interface CentralVideoSession {
  accessToken: string;
}

declare module "next-auth" {
  interface User {
    sessionVersion?: number;
    centralPurchasesSession?: CentralPurchasesSession;
    centralMarketingSession?: CentralMarketingSession;
    makerWalletSession?: MakerWalletSession;
    centralVideoSession?: CentralVideoSession;
  }
  interface Session {
    user: {
      id: string;
      sessionVersion: number;
      centralPurchasesSession?: CentralPurchasesSession;
      centralMarketingSession?: CentralMarketingSession;
      makerWalletSession?: MakerWalletSession;
      centralVideoSession?: CentralVideoSession;
    } & DefaultSession["user"];
  }
}
declare module "next-auth/jwt" {
  interface JWT {
    sessionVersion?: number;
    centralPurchasesSession?: CentralPurchasesSession;
    centralMarketingSession?: CentralMarketingSession;
    makerWalletSession?: MakerWalletSession;
    centralVideoSession?: CentralVideoSession;
  }
}
