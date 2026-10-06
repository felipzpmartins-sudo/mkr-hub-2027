import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Crown, KeyRound, Loader2, Users } from "lucide-react";
import { api, setSession, type ApiUser } from "@/lib/api";
import { RetroButton } from "@/components/RetroButton";
import { RetroInput } from "@/components/RetroInput";

const members = [
  { key: "captain", name: "Guilherme", role: "Capitão", icon: Crown },
  { key: "richard", name: "Richard", role: "Tripulante", icon: Users },
  { key: "mah", name: "Mah", role: "Tripulante", icon: Users },
  { key: "jade", name: "Jade", role: "Tripulante", icon: Users },
];

function destinationFor(user: ApiUser) {
  return user.role === "capitao" ? "/captain" : "/crew";
}

export default function TeamAccess() {
  const navigate = useNavigate();
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const selected = members.find((member) => member.key === selectedKey);

  async function enter(event: FormEvent) {
    event.preventDefault();
    if (!selectedKey || !password) return;
    setError("");
    setSubmitting(true);
    try {
      const result = await api.crewLogin(selectedKey, password);
      setSession(result.token, result.user);
      navigate(destinationFor(result.user), { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível acessar a equipe.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground">
      <section className="mx-auto max-w-3xl">
        <RetroButton variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
          <ArrowLeft size={15} className="mr-2" /> Voltar para minhas solicitações
        </RetroButton>
        <div className="mt-10 max-w-xl">
          <p className="text-xs tracking-[0.2em] text-muted-foreground">CENTRAL DE VÍDEOS</p>
          <h1 className="mt-3 text-4xl font-light">Acesso da equipe</h1>
          <p className="mt-3 text-muted-foreground">Selecione o perfil de trabalho para entrar na área da equipe.</p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {members.map((member) => {
            const Icon = member.icon;
            const active = member.key === selectedKey;
            return (
              <button
                key={member.key}
                type="button"
                onClick={() => { setSelectedKey(member.key); setPassword(""); setError(""); }}
                className={`border p-6 text-left transition-colors ${active ? "border-foreground bg-muted" : "border-border bg-card hover:border-foreground/50"} ${member.key === "captain" ? "sm:col-span-2" : ""}`}
              >
                <Icon size={23} className="mb-6" />
                <p className="font-medium">{member.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{member.role}</p>
              </button>
            );
          })}
        </div>

        {selected && (
          <form onSubmit={enter} className="mt-6 max-w-md border border-border bg-card p-6">
            <div className="mb-5 flex items-center gap-3"><KeyRound size={18} /><div><p className="font-medium">Entrar como {selected.name}</p><p className="text-sm text-muted-foreground">Informe a senha da equipe.</p></div></div>
            <RetroInput label="Senha" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoFocus required />
            {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
            <RetroButton type="submit" variant="primary" className="mt-6 w-full" disabled={submitting}>
              {submitting ? <Loader2 size={16} className="mx-auto animate-spin" /> : "Entrar na equipe"}
            </RetroButton>
          </form>
        )}
      </section>
    </main>
  );
}
