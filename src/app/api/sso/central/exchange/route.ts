import { NextResponse } from "next/server";
import {
  consumeCentralPurchasesSsoTicket,
  isCentralPurchasesOrigin,
} from "@/services/central-purchases";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function corsHeaders(origin: string) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  };
}

function denied() {
  return NextResponse.json(
    { error: "Não foi possível concluir o acesso único." },
    { status: 403, headers: { "Cache-Control": "no-store" } },
  );
}

export function OPTIONS(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || !isCentralPurchasesOrigin(origin)) return denied();
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || !isCentralPurchasesOrigin(origin)) return denied();

  let ticket = "";
  try {
    const body: unknown = await request.json();
    if (body && typeof body === "object" && typeof (body as { ticket?: unknown }).ticket === "string")
      ticket = (body as { ticket: string }).ticket;
  } catch {
    return denied();
  }

  const session = await consumeCentralPurchasesSsoTicket(ticket);
  if (!session) return denied();
  return NextResponse.json(session, {
    headers: { ...corsHeaders(origin), "Cache-Control": "no-store" },
  });
}
