import { isIP } from "node:net";
import { headers } from "next/headers";

export function trustedIp(source: Headers) {
  if (process.env.TRUST_PROXY !== "true") return null;
  const candidate = source.get("x-forwarded-for")?.split(",")[0]?.trim();
  return candidate && isIP(candidate) ? candidate : null;
}
export async function requestIp() {
  return trustedIp(await headers());
}
