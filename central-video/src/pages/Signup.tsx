import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, UserPlus } from "lucide-react";
import { api, setSession, type ApiUser } from "@/lib/api";
import { RetroButton } from "@/components/RetroButton";
import { RetroInput } from "@/components/RetroInput";

function destinationFor(user: ApiUser) {
  if (user.role === "capitao") return "/captain";
  if (user.role === "tripulante") return "/crew";
  return "/dashboard";
}

export default function Signup() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!name.trim() || !email.includes("@") || password.length < 6) {
      setError("Informe nome, e-mail válido e uma senha com pelo menos 6 caracteres.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await api.register(name.trim(), email.trim().toLowerCase(), password);
      setSession(result.token, result.user);
      navigate(destinationFor(result.user), { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível criar sua conta.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-12 text-foreground">
      <section className="w-full max-w-md border border-border bg-card p-8 shadow-xl">
        <div className="mb-8 flex items-center gap-3"><UserPlus size={22} /><div><p className="text-xs tracking-[0.18em] text-muted-foreground">CENTRAL DE VÍDEOS</p><h1 className="mt-1 text-2xl font-light">Criar sua conta</h1></div></div>
        <p className="mb-7 text-sm text-muted-foreground">Cadastre-se para enviar e acompanhar suas solicitações de vídeo.</p>
        <form onSubmit={submit} className="space-y-6">
          <RetroInput label="Nome" value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required />
          <RetroInput label="E-mail" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required />
          <RetroInput label="Senha" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength={6} required />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <RetroButton type="submit" variant="primary" className="w-full" disabled={submitting}>
            {submitting ? <Loader2 size={16} className="mx-auto animate-spin" /> : "Criar conta e entrar"}
          </RetroButton>
          <RetroButton type="button" variant="ghost" className="w-full" onClick={() => window.location.replace(import.meta.env.VITE_MKR_HUB_URL?.trim() || "http://localhost:3000/dashboard")}>Voltar ao MKR HUB</RetroButton>
        </form>
      </section>
    </main>
  );
}
