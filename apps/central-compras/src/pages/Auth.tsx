import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, Mail, Lock, User, Phone, ArrowRight } from "lucide-react";
import MkrRobot from "@/components/MkrRobot";

const mustResetPassword = (user?: { user_metadata?: Record<string, unknown> } | null) =>
  user?.user_metadata?.must_reset_password === true;

const Auth = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [robotLook, setRobotLook] = useState<{ x: number; y: number } | null>(null);
  const lookAtForm = () => setRobotLook({ x: 0.55, y: -0.15 });
  const releaseLook = () => setRobotLook(null);

  useEffect(() => {
    let isMounted = true;

    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!isMounted || !user) return;

      navigate(mustResetPassword(user) ? "/reset-password" : "/");
    };

    checkUser();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) return toast.error("Digite um e-mail válido");
    if (!fullName.trim()) return toast.error("Digite seu nome completo");
    if (!phone.trim()) return toast.error("Digite seu telefone");
    if (password.length < 6) return toast.error("A senha deve ter no mínimo 6 caracteres");

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: { full_name: fullName.trim(), phone: phone.trim() },
        },
      });
      if (error) {
        if (error.message?.includes('already registered')) return toast.error("Este e-mail já está cadastrado. Tente fazer login.");
        if (error.message?.includes('rate limit')) return toast.error("Muitas tentativas. Aguarde alguns segundos.");
        throw error;
      }
      if (data.user) {
        toast.success("Conta criada com sucesso! Você já pode fazer login.");
        setMode("login");
        setPassword(""); setFullName(""); setPhone("");
      }
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Erro ao criar conta";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      if (mustResetPassword(data.user)) {
        toast.success("Login realizado! Defina uma nova senha para continuar.");
        navigate("/reset-password");
        return;
      }

      const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', data.user.id);
      const isAdmin = roles?.some(r => r.role === 'admin');
      toast.success("Login realizado com sucesso!");
      navigate(isAdmin ? "/admin" : "/");
    } catch (error: any) {
      toast.error(error.message || "Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mkr-auth min-h-screen lg:h-dvh lg:min-h-0 w-full relative overflow-x-hidden overflow-y-hidden lg:flex lg:flex-col bg-[#03060d] text-slate-100">
      {/* Ambient background */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-40 w-[42rem] h-[42rem] rounded-full bg-[#0a3fff]/20 blur-[140px] animate-mkr-drift" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[36rem] h-[36rem] rounded-full bg-cyan-400/10 blur-[120px] animate-mkr-drift-slow" />
        <div className="absolute -bottom-40 -right-40 w-[44rem] h-[44rem] rounded-full bg-[#1e6bff]/15 blur-[140px] animate-mkr-drift" />
        {/* grid */}
        <div className="absolute inset-0 opacity-[0.08]" style={{
          backgroundImage: "linear-gradient(rgba(120,180,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(120,180,255,.5) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse at center, black 40%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 40%, transparent 75%)"
        }} />
        {/* connection dots */}
        <svg className="absolute inset-0 w-full h-full opacity-30" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <radialGradient id="dot" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#5cc8ff" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#5cc8ff" stopOpacity="0" />
            </radialGradient>
          </defs>
          {[...Array(18)].map((_, i) => {
            const x = (i * 137) % 100;
            const y = (i * 71) % 100;
            return <circle key={i} cx={`${x}%`} cy={`${y}%`} r="2" fill="url(#dot)" />;
          })}
        </svg>
      </div>

      {/* Top bar */}
      <header className="relative z-10 flex items-center justify-between px-8 md:px-14 pt-6 lg:pt-4 shrink-0">
        <div className="flex items-center gap-3">
          <MkrMark className="w-7 h-7" />
          <span className="font-semibold tracking-[0.28em] text-sm text-white">MKR</span>
          <span className="hidden md:inline-block ml-3 pl-3 border-l border-white/10 text-[11px] tracking-[0.32em] text-slate-400">
            CENTRAL DE COMPRAS
          </span>
        </div>
        <div className="hidden md:flex items-center gap-6 text-[11px] tracking-[0.28em] text-slate-500">
          <span>GESTÃO</span><span className="text-cyan-400">•</span>
          <span>CONTROLE</span><span className="text-cyan-400">•</span>
          <span>EFICIÊNCIA</span>
        </div>
      </header>

      {/* Main grid */}
      <main className="relative z-10 grid lg:grid-cols-[1.05fr_0.95fr] gap-6 lg:gap-10 px-8 md:px-14 py-6 md:py-8 lg:py-4 items-center max-w-[1500px] mx-auto w-full lg:flex-1 lg:min-h-0">
        {/* LEFT: institutional */}
        <section className="relative overflow-visible lg:min-h-[560px]">
          {/* 3D robot area — absolute overlay on lg so it does not add to page height */}
          <div className="pointer-events-none hidden lg:flex lg:absolute lg:inset-0 lg:-top-16 items-start justify-center lg:ml-8 xl:ml-16 overflow-visible z-0">
            <div className="pointer-events-auto relative w-[560px] h-[560px] xl:w-[600px] xl:h-[600px] overflow-visible">
              {/* ambient rings */}
              <div className="absolute inset-0 z-0 rounded-full bg-gradient-to-br from-cyan-400/20 via-blue-600/10 to-transparent blur-3xl animate-mkr-pulse" />
              <div className="absolute inset-14 z-0 rounded-full border border-white/5" />
              <div className="absolute inset-28 z-0 rounded-full border border-white/[0.03]" />
              {/* discreet background wordmark */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-1/2 z-0 -translate-y-1/2 text-center font-semibold whitespace-nowrap leading-none text-white/[0.04] text-[88px] xl:text-[104px]"
                style={{ letterSpacing: "0.3em", textShadow: "0 0 60px rgba(34,211,238,0.12)" }}
              >
                CENTRAL DE COMPRAS
              </div>
              {/* robot */}
              <div className="absolute -inset-x-24 -top-28 -bottom-20 z-10 overflow-visible">
                <MkrRobot lookAt={robotLook} />
              </div>
            </div>
          </div>


          <div className="max-w-xl relative z-10 lg:mt-[420px] xl:mt-[460px]">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] backdrop-blur px-3 py-1 text-[10px] tracking-[0.32em] text-cyan-300/90 mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_10px_2px_rgba(103,232,249,0.8)]" />
              PLATAFORMA CORPORATIVA
            </div>
            <h1 className="font-semibold text-4xl md:text-5xl lg:text-[3.4rem] leading-[1.05] tracking-tight text-white">
              Compras inteligentes.
              <br />
              <span className="bg-gradient-to-r from-cyan-300 via-sky-400 to-blue-500 bg-clip-text text-transparent">
                Decisões mais rápidas.
              </span>
            </h1>
            <p className="mt-6 text-slate-400 text-base md:text-lg max-w-lg leading-relaxed">
              Centralize processos, fornecedores, negociações e oportunidades em um único ambiente.
            </p>

            <div className="mt-10 grid grid-cols-3 gap-4 max-w-md">
              {[
                { k: "Fornecedores", v: "unificados" },
                { k: "Aprovações", v: "em tempo real" },
                { k: "Dados", v: "auditáveis" },
              ].map((s) => (
                <div key={s.k} className="rounded-lg border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-3">
                  <div className="text-[10px] tracking-[0.22em] text-slate-500 uppercase">{s.k}</div>
                  <div className="text-xs text-cyan-300 mt-1">{s.v}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* RIGHT: login panel */}
        <section className="relative flex justify-center lg:justify-end" onMouseEnter={lookAtForm} onMouseLeave={releaseLook} onFocus={lookAtForm} onBlur={releaseLook}>
          <div className="absolute -inset-4 bg-gradient-to-br from-cyan-400/10 via-blue-600/10 to-transparent rounded-3xl blur-2xl" />
          <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#070b18]/70 backdrop-blur-xl shadow-[0_20px_80px_-20px_rgba(30,120,255,0.35)] p-8 md:p-10 animate-mkr-in">
            {/* corner accents */}
            <span className="absolute top-3 left-3 w-4 h-px bg-cyan-400/70" />
            <span className="absolute top-3 left-3 w-px h-4 bg-cyan-400/70" />
            <span className="absolute bottom-3 right-3 w-4 h-px bg-cyan-400/70" />
            <span className="absolute bottom-3 right-3 w-px h-4 bg-cyan-400/70" />

            <div className="text-[10px] tracking-[0.32em] text-cyan-300/80 mb-2">ACESSO À PLATAFORMA</div>
            <h2 className="text-2xl font-semibold text-white">
              {mode === "login" ? "Bem-vindo de volta" : "Solicitar acesso"}
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              {mode === "login"
                ? "Entre com suas credenciais para acessar a Central de Compras."
                : "Preencha seus dados para criar seu acesso."}
            </p>

            {mode === "login" ? (
              <form onSubmit={handleSignIn} className="mt-7 space-y-5">
                <Field icon={<Mail className="w-4 h-4" />} label="E-mail corporativo" htmlFor="email">
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                    disabled={loading}
                    className="mkr-input"
                  />
                </Field>

                <Field icon={<Lock className="w-4 h-4" />} label="Senha" htmlFor="password">
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      required
                      minLength={6}
                      disabled={loading}
                      className="mkr-input pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-cyan-300 transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </Field>

                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 text-slate-400 cursor-pointer">
                    <Checkbox
                      checked={remember}
                      onCheckedChange={(v) => setRemember(!!v)}
                      className="border-white/20 data-[state=checked]:bg-cyan-500 data-[state=checked]:border-cyan-500"
                    />
                    Lembrar meu acesso
                  </label>
                  <a href="#" className="text-cyan-300/90 hover:text-cyan-200 transition-colors">
                    Esqueci minha senha
                  </a>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full h-12 rounded-lg font-semibold tracking-[0.18em] text-sm text-white
                             bg-gradient-to-r from-[#0a5cff] via-[#1e88ff] to-[#22d3ee]
                             shadow-[0_10px_30px_-10px_rgba(34,211,238,0.6)]
                             hover:shadow-[0_16px_40px_-10px_rgba(34,211,238,0.8)]
                             hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-60 disabled:hover:translate-y-0"
                >
                  <span className="flex items-center justify-center gap-2">
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    ENTRAR NA PLATAFORMA
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                </button>

                <p className="text-center text-sm text-slate-500">
                  Ainda não possui acesso?{" "}
                  <button
                    type="button"
                    onClick={() => setMode("signup")}
                    className="text-cyan-300 hover:text-cyan-200 font-medium transition-colors"
                  >
                    Solicitar acesso
                  </button>
                </p>
              </form>
            ) : (
              <form onSubmit={handleSignUp} className="mt-7 space-y-4">
                <Field icon={<User className="w-4 h-4" />} label="Nome completo" htmlFor="s-name">
                  <input id="s-name" className="mkr-input" value={fullName} onChange={e => setFullName(e.target.value)} required disabled={loading} />
                </Field>
                <Field icon={<Mail className="w-4 h-4" />} label="E-mail corporativo" htmlFor="s-email">
                  <input id="s-email" type="email" className="mkr-input" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} required disabled={loading} />
                </Field>
                <Field icon={<Phone className="w-4 h-4" />} label="Telefone" htmlFor="s-phone">
                  <input id="s-phone" type="tel" className="mkr-input" placeholder="(11) 98765-4321" value={phone} onChange={e => setPhone(e.target.value)} required disabled={loading} />
                </Field>
                <Field icon={<Lock className="w-4 h-4" />} label="Senha (mín. 6 caracteres)" htmlFor="s-pass">
                  <input id="s-pass" type="password" className="mkr-input" placeholder="••••••••••••" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} disabled={loading} />
                </Field>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-lg font-semibold tracking-[0.18em] text-sm text-white
                             bg-gradient-to-r from-[#0a5cff] via-[#1e88ff] to-[#22d3ee]
                             shadow-[0_10px_30px_-10px_rgba(34,211,238,0.6)]
                             hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-60"
                >
                  <span className="flex items-center justify-center gap-2">
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    CRIAR CONTA
                  </span>
                </button>
                <p className="text-center text-sm text-slate-500">
                  Já possui acesso?{" "}
                  <button type="button" onClick={() => setMode("login")} className="text-cyan-300 hover:text-cyan-200 font-medium">
                    Fazer login
                  </button>
                </p>
              </form>
            )}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-2 px-8 md:px-14 pb-6 lg:pb-4 text-[11px] tracking-[0.24em] text-slate-500 shrink-0 mt-auto">
        <span>SISTEMA CORPORATIVO MKR</span>
        <span>MKR © 2026 • AMBIENTE SEGURO</span>
      </footer>


      <style>{`
        .mkr-auth .mkr-input {
          width: 100%;
          height: 44px;
          padding: 0 14px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px;
          color: #e2e8f0;
          font-size: 14px;
          outline: none;
          transition: border-color .2s, box-shadow .2s, background .2s;
        }
        .mkr-auth .mkr-input::placeholder { color: rgb(100 116 139 / 0.7); }
        .mkr-auth .mkr-input:focus {
          border-color: rgba(34,211,238,0.55);
          background: rgba(255,255,255,0.05);
          box-shadow: 0 0 0 4px rgba(34,211,238,0.10), 0 0 24px -4px rgba(34,211,238,0.35);
        }
        @keyframes mkr-drift { 0%,100%{transform:translate(0,0)} 50%{transform:translate(40px,-30px)} }
        @keyframes mkr-drift-slow { 0%,100%{transform:translate(-50%,0) scale(1)} 50%{transform:translate(-50%,20px) scale(1.05)} }
        @keyframes mkr-pulse { 0%,100%{opacity:.7} 50%{opacity:1} }
        @keyframes mkr-float { 0%,100%{transform:translateY(0) rotate(0deg)} 50%{transform:translateY(-14px) rotate(6deg)} }
        @keyframes mkr-in { from{opacity:0; transform:translateY(14px)} to{opacity:1; transform:translateY(0)} }
        .animate-mkr-drift { animation: mkr-drift 14s ease-in-out infinite; }
        .animate-mkr-drift-slow { animation: mkr-drift-slow 18s ease-in-out infinite; }
        .animate-mkr-pulse { animation: mkr-pulse 6s ease-in-out infinite; }
        .animate-mkr-float { animation: mkr-float 8s ease-in-out infinite; }
        .animate-mkr-in { animation: mkr-in .6s cubic-bezier(.2,.7,.2,1) both; }
      `}</style>
    </div>
  );
};

const Field = ({ icon, label, htmlFor, children }: { icon: React.ReactNode; label: string; htmlFor: string; children: React.ReactNode }) => (
  <div>
    <Label htmlFor={htmlFor} className="flex items-center gap-2 text-[11px] tracking-[0.22em] uppercase text-slate-400 mb-2">
      <span className="text-cyan-300/80">{icon}</span>
      {label}
    </Label>
    {children}
  </div>
);

// MKR logo mark (stylized "M" with cyan accent)
const MkrMark = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 48 48" className={className} fill="none">
    <defs>
      <linearGradient id="mkrgrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#22d3ee" />
        <stop offset="100%" stopColor="#1e88ff" />
      </linearGradient>
    </defs>
    <rect x="1" y="1" width="46" height="46" rx="10" stroke="url(#mkrgrad)" strokeWidth="1.5" fill="rgba(34,211,238,0.05)" />
    <path d="M10 34 V14 L24 26 L38 14 V34" stroke="url(#mkrgrad)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <circle cx="24" cy="26" r="2" fill="#22d3ee" />
  </svg>
);

// Large 3D-ish glass symbol inspired by MKR mark
const MkrGlass = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 400 400" className={className} fill="none">
    <defs>
      <radialGradient id="glowCore" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.9" />
        <stop offset="60%" stopColor="#0a5cff" stopOpacity="0.35" />
        <stop offset="100%" stopColor="#0a5cff" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="glassGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#a5f3fc" stopOpacity="0.9" />
        <stop offset="45%" stopColor="#22d3ee" stopOpacity="0.6" />
        <stop offset="100%" stopColor="#0a5cff" stopOpacity="0.9" />
      </linearGradient>
      <linearGradient id="glassEdge" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#e0f7ff" stopOpacity="0.9" />
        <stop offset="100%" stopColor="#0a5cff" stopOpacity="0.2" />
      </linearGradient>
      <filter id="soft" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="2" />
      </filter>
    </defs>
    <circle cx="200" cy="200" r="180" fill="url(#glowCore)" />
    <g filter="url(#soft)" opacity="0.85">
      <path d="M90 300 V100 L200 200 L310 100 V300" stroke="url(#glassGrad)" strokeWidth="22" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </g>
    <path d="M90 300 V100 L200 200 L310 100 V300" stroke="url(#glassEdge)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <path d="M96 296 V110 L200 205" stroke="#e0f7ff" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
    <circle cx="200" cy="200" r="10" fill="#e0f7ff" opacity="0.9" />
    <circle cx="200" cy="200" r="22" fill="#22d3ee" opacity="0.15" />
  </svg>
);

export default Auth;
