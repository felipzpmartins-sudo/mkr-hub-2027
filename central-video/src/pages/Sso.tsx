import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, setSession, type ApiUser } from "@/lib/api";

const hubUrl = () => import.meta.env.VITE_MKR_HUB_URL?.trim() || "http://localhost:3000/dashboard";

function destinationFor(user: ApiUser) {
  if (user.role === "capitao") return "/captain";
  if (user.role === "tripulante") return "/crew";
  return "/dashboard";
}

export default function Sso() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("Validando seu acesso pelo MKR HUB…");

  useEffect(() => {
    const ticket = new URLSearchParams(window.location.search).get("ticket");
    const exchangeUrl = import.meta.env.VITE_MKR_HUB_SSO_EXCHANGE_URL?.trim();
    if (!ticket || !exchangeUrl) {
      window.location.replace(hubUrl());
      return;
    }

    let active = true;
    void (async () => {
      try {
        const exchange = await fetch(exchangeUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticket }),
        });
        const payload: unknown = await exchange.json().catch(() => null);
        const accessToken =
          payload && typeof payload === "object" && typeof (payload as { accessToken?: unknown }).accessToken === "string"
            ? (payload as { accessToken: string }).accessToken
            : null;
        if (!exchange.ok || !accessToken) throw new Error("sso_exchange_failed");

        const profileResponse = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const profilePayload: unknown = await profileResponse.json().catch(() => null);
        const user =
          profilePayload && typeof profilePayload === "object" && (profilePayload as { user?: unknown }).user
            ? ((profilePayload as { user: ApiUser }).user)
            : null;
        if (!profileResponse.ok || !user || !user.id || !user.email || !user.name) throw new Error("video_session_failed");

        setSession(accessToken, user);
        if (active) navigate(destinationFor(user), { replace: true });
      } catch {
        if (active) {
          setMessage("Não foi possível concluir o acesso único. Voltando para o MKR HUB…");
          window.location.replace(hubUrl());
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [navigate]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
      <section className="max-w-md rounded-xl border border-border bg-card p-8 text-center shadow-xl">
        <p className="text-sm font-medium tracking-[0.18em] text-primary">CENTRAL DE VÍDEOS</p>
        <h1 className="mt-3 text-2xl font-semibold">Acesso ao sistema</h1>
        <p className="mt-3 text-sm text-muted-foreground">{message}</p>
      </section>
    </main>
  );
}
