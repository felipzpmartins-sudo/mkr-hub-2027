import { getToken } from "next-auth/jwt";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET,
    secureCookie:
      process.env.AUTH_URL?.startsWith("https://") ?? request.nextUrl.protocol === "https:",
  });
  if (!token) return NextResponse.redirect(new URL("/login", request.url));
  return NextResponse.next();
}
export const config = { matcher: ["/", "/systems/:path*", "/profile/:path*", "/admin/:path*"] };
