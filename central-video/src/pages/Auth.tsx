import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Play, Lock, X, Loader2 } from "lucide-react";
import ImageCarousel from "@/components/ImageCarousel";
import { useToast } from "@/hooks/use-toast";
import { crewMembers } from "@/constants/crew";
import { api, setSession } from "@/lib/api";

type AuthMode = "login" | "register" | "crew";
type RegisterStep = 1 | 2 | 3;

const CREW_PASSWORD = "!AUDIOvisual";

const Auth = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>("login");
  const [registerStep, setRegisterStep] = useState<RegisterStep>(1);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [selectedCrewMember, setSelectedCrewMember] = useState<string | null>(null);
  const [crewPassword, setCrewPassword] = useState("");
  const [crewPasswordError, setCrewPasswordError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const { toast } = useToast();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: "" });
  };

  const validateCurrentStep = () => {
    const newErrors: Record<string, string> = {};

    if (mode === "register") {
      if (registerStep === 1 && !formData.name.trim()) {
        newErrors.name = "Por favor, insira seu nome";
      }
      if (registerStep === 2) {
        if (!formData.email) {
          newErrors.email = "Por favor, insira seu e-mail";
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
          newErrors.email = "E-mail inválido";
        }
      }
      if (registerStep === 3) {
        if (!formData.password) {
          newErrors.password = "Por favor, insira uma senha";
        } else if (formData.password.length < 6) {
          newErrors.password = "Mínimo de 6 caracteres";
        }
      }
    } else if (mode === "login") {
      if (!formData.email) {
        newErrors.email = "E-mail é obrigatório";
      }
      if (!formData.password) {
        newErrors.password = "Senha é obrigatória";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = async () => {
    if (!validateCurrentStep()) return;
    
    if (registerStep < 3) {
      setRegisterStep((prev) => (prev + 1) as RegisterStep);
    } else {
      // Criar conta no Supabase Auth
      setIsLoading(true);
      setAuthError("");
      
      try {
        const data = await api.register(formData.name, formData.email, formData.password);
        setSession(data.token, data.user);
        if (data.user) {
          toast({
            title: "Conta criada!",
            description: "Cadastro realizado com sucesso.",
          });
          navigate("/dashboard");
        }
      } catch (error: any) {
        console.error("Erro no registro:", error);
        setAuthError(error.message || "Erro ao criar conta.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleBack = () => {
    if (registerStep > 1) {
      setRegisterStep((prev) => (prev - 1) as RegisterStep);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateCurrentStep()) return;
    
    setIsLoading(true);
    setAuthError("");
    
    try {
      const data = await api.login(formData.email, formData.password);
      setSession(data.token, data.user);
      if (data.user) {
        toast({
          title: "Bem-vindo!",
          description: "Login realizado com sucesso.",
        });
        navigate("/dashboard");
      }
    } catch (error: any) {
      console.error("Erro no login:", error);
      setAuthError(error.message || "E-mail ou senha incorretos.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCrewMemberClick = (memberId: string) => {
    setSelectedCrewMember(memberId);
    setCrewPassword("");
    setCrewPasswordError("");
  };

  const handleCrewPasswordSubmit = async () => {
    if (crewPassword !== CREW_PASSWORD) {
      setCrewPasswordError("Senha incorreta");
      return;
    }
    
    if (!selectedCrewMember) {
      setCrewPasswordError("Perfil não encontrado");
      return;
    }
    
    setIsLoading(true);
    setCrewPasswordError("");
    
    try {
      const data = await api.crewLogin(selectedCrewMember, crewPassword);
      setSession(data.token, data.user);
      if (data.user) {
        toast({
          title: "Bem-vindo!",
          description: `Acesso liberado para ${crewMembers.find(m => m.id === selectedCrewMember)?.name}.`,
        });
        navigate(selectedCrewMember === "captain" ? "/captain" : "/crew");
      }
    } catch (error: any) {
      console.error("Erro no login da tripulação:", error);
      setCrewPasswordError(error.message || "Erro ao acessar.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && mode === "register") {
      e.preventDefault();
      handleNext();
    }
  };

  const handleCrewPasswordKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCrewPasswordSubmit();
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center gap-3 mb-12">
      {[1, 2, 3].map((step) => (
        <div key={step} className="flex items-center gap-3">
          <motion.div
            initial={false}
            animate={{
              backgroundColor: step <= registerStep ? "hsl(0 0% 100%)" : "hsl(0 0% 15%)",
              color: step <= registerStep ? "hsl(0 0% 4%)" : "hsl(0 0% 50%)",
            }}
            className="w-10 h-10 flex items-center justify-center text-sm font-medium"
          >
            {step < registerStep ? <Check size={16} /> : step}
          </motion.div>
          {step < 3 && (
            <motion.div 
              initial={false}
              animate={{ 
                backgroundColor: step < registerStep ? "hsl(0 0% 100%)" : "hsl(0 0% 15%)" 
              }}
              className="w-12 h-[2px]" 
            />
          )}
        </div>
      ))}
    </div>
  );

  const renderRegisterStep = () => {
    const stepConfig = {
      1: {
        label: "Como podemos te chamar?",
        sublabel: "Insira seu nome para começarmos",
        field: "name",
        type: "text",
        placeholder: "Seu nome",
      },
      2: {
        label: "Qual seu e-mail?",
        sublabel: "Usaremos para enviar atualizações",
        field: "email",
        type: "email",
        placeholder: "seu@email.com",
      },
      3: {
        label: "Crie uma senha",
        sublabel: "Mínimo de 6 caracteres",
        field: "password",
        type: "password",
        placeholder: "••••••••",
      },
    };

    const config = stepConfig[registerStep];

    return (
      <motion.div
        key={registerStep}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.3 }}
        className="w-full"
      >
        <h2 className="text-3xl md:text-4xl font-extralight text-foreground mb-2">
          {config.label}
        </h2>
        <p className="text-muted-foreground mb-8">{config.sublabel}</p>

        <input
          type={config.type}
          name={config.field}
          value={formData[config.field as keyof typeof formData]}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder={config.placeholder}
          autoFocus
          className="elegant-input w-full text-2xl md:text-3xl font-light"
        />
        {errors[config.field] && (
          <motion.p 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-destructive text-sm mt-4"
          >
            {errors[config.field]}
          </motion.p>
        )}
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col lg:flex-row">
      {/* Mobile Carousel - Top */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="lg:hidden h-48 relative overflow-hidden"
      >
        <ImageCarousel />
      </motion.div>

      {/* Left side - Form */}
      <div className="flex-1 flex flex-col p-6 md:p-12 lg:p-16 relative z-10">
        {/* Header */}
        <div className="flex justify-between items-center mb-auto">
          <button 
            onClick={() => mode === "register" && registerStep > 1 ? handleBack() : navigate("/")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors duration-300"
          >
            <ArrowLeft size={18} />
            <span className="text-sm">
              {mode === "register" && registerStep > 1 ? "Voltar" : "Início"}
            </span>
          </button>

          <div className="flex items-center gap-3">
            <div className="w-8 h-8 border border-border flex items-center justify-center">
              <Play className="w-3 h-3 text-foreground" fill="currentColor" />
            </div>
          </div>
        </div>

        {/* Main form area */}
        <div className="flex-1 flex flex-col justify-center max-w-lg">
          {/* Mode tabs */}
          <div className="flex gap-6 mb-8">
            {[
              { id: "login" as AuthMode, label: "Entrar" },
              { id: "register" as AuthMode, label: "Cadastrar" },
              { id: "crew" as AuthMode, label: "Equipe" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setMode(tab.id);
                  setRegisterStep(1);
                  setErrors({});
                }}
                className={`text-sm tracking-wide transition-all duration-300 pb-2 border-b-2 ${
                  mode === tab.id
                    ? "text-foreground border-foreground"
                    : "text-muted-foreground border-transparent hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Form content */}
          <AnimatePresence mode="wait">
            {mode === "crew" ? (
              <motion.div
                key="crew"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <h2 className="text-3xl md:text-4xl font-extralight text-foreground mb-2">
                  Selecione seu perfil
                </h2>
                <p className="text-muted-foreground mb-8">Acesso exclusivo para a equipe</p>

                <div className="grid grid-cols-2 gap-4">
                  {crewMembers.map((member, index) => (
                    <motion.button
                      key={member.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      onClick={() => handleCrewMemberClick(member.id)}
                      className={`group p-6 border transition-all duration-300 text-left ${
                        member.id === "captain"
                          ? "col-span-2 border-foreground bg-foreground/5 hover:bg-foreground hover:text-background"
                          : "border-border hover:border-foreground hover:bg-foreground/5"
                      }`}
                    >
                      <member.icon className={`w-6 h-6 mb-4 ${
                        member.id === "captain" ? "text-foreground group-hover:text-background" : "text-muted-foreground group-hover:text-foreground"
                      }`} />
                      <p className={`font-medium ${member.id === "captain" ? "group-hover:text-background" : ""}`}>
                        {member.name}
                      </p>
                      <p className={`text-sm ${member.id === "captain" ? "text-muted-foreground group-hover:text-background/70" : "text-muted-foreground"}`}>
                        {member.role}
                      </p>
                    </motion.button>
                  ))}
                </div>

                {/* Password Modal */}
                <AnimatePresence>
                  {selectedCrewMember && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                      onClick={() => setSelectedCrewMember(null)}
                    >
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-background border border-border p-8 w-full max-w-md"
                      >
                        <div className="flex justify-between items-start mb-6">
                          <div>
                            <h3 className="text-xl font-light text-foreground">
                              {crewMembers.find(m => m.id === selectedCrewMember)?.name}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {crewMembers.find(m => m.id === selectedCrewMember)?.role}
                            </p>
                          </div>
                          <button
                            onClick={() => setSelectedCrewMember(null)}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <X size={20} />
                          </button>
                        </div>

                        <div className="flex items-center gap-3 mb-6 p-4 bg-muted/30 border border-border">
                          <Lock size={18} className="text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Digite a senha para acessar</span>
                        </div>

                        <input
                          type="password"
                          value={crewPassword}
                          onChange={(e) => {
                            setCrewPassword(e.target.value);
                            setCrewPasswordError("");
                          }}
                          onKeyDown={handleCrewPasswordKeyDown}
                          placeholder="Senha da equipe"
                          autoFocus
                          className="elegant-input w-full mb-4"
                        />

                        {crewPasswordError && (
                          <motion.p
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-destructive text-sm mb-4"
                          >
                            {crewPasswordError}
                          </motion.p>
                        )}

                        <button
                          onClick={handleCrewPasswordSubmit}
                          disabled={isLoading}
                          className="w-full flex items-center justify-center gap-3 bg-foreground text-background px-8 py-4 text-sm font-medium tracking-wide hover:bg-foreground/90 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isLoading ? <Loader2 size={16} className="animate-spin" /> : <>
                            Acessar
                            <ArrowRight size={16} />
                          </>}
                        </button>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ) : mode === "register" ? (
              <div>
                {renderStepIndicator()}
                <AnimatePresence mode="wait">
                  {renderRegisterStep()}
                </AnimatePresence>

                {/* Navigation buttons */}
                <div className="flex gap-4 mt-12">
                  {registerStep > 1 && (
                    <button
                      onClick={handleBack}
                      className="px-8 py-4 border border-border text-foreground text-sm font-medium tracking-wide hover:bg-muted transition-all duration-300"
                    >
                      Voltar
                    </button>
                  )}
                  <button
                    onClick={handleNext}
                    disabled={isLoading}
                    className="group flex-1 flex items-center justify-center gap-3 bg-foreground text-background px-8 py-4 text-sm font-medium tracking-wide hover:bg-foreground/90 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading && registerStep === 3 ? <Loader2 size={16} className="animate-spin" /> : <>
                      {registerStep === 3 ? "Criar Conta" : "Continuar"}
                      <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform duration-300" />
                    </>}
                  </button>
                </div>
              </div>
            ) : (
              <motion.form
                key="login"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                onSubmit={handleLogin}
              >
                <h2 className="text-3xl md:text-4xl font-extralight text-foreground mb-2">
                  Bem-vindo de volta
                </h2>
                <p className="text-muted-foreground mb-8">Acesse sua conta</p>

                <div className="space-y-6">
                  <div>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="E-mail"
                      className="elegant-input w-full"
                    />
                    {errors.email && (
                      <p className="text-destructive text-sm mt-2">{errors.email}</p>
                    )}
                  </div>
                  <div>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Senha"
                      className="elegant-input w-full"
                    />
                    {errors.password && (
                      <p className="text-destructive text-sm mt-2">{errors.password}</p>
                    )}
                  </div>
                </div>

                {authError && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-destructive text-sm mt-6"
                  >
                    {authError}
                  </motion.p>
                )}

                <button
                  type="submit"
                  disabled={isLoading}
                  className="group w-full flex items-center justify-center gap-3 bg-foreground text-background px-8 py-4 mt-8 text-sm font-medium tracking-wide hover:bg-foreground/90 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? <Loader2 size={16} className="animate-spin" /> : <>
                    Entrar
                    <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform duration-300" />
                  </>}
                </button>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Footer links */}
          {mode !== "crew" && (
            <p className="text-sm text-muted-foreground mt-8">
              {mode === "login" ? (
                <>
                  Não tem conta?{" "}
                  <button 
                    onClick={() => { setMode("register"); setRegisterStep(1); }}
                    className="text-foreground hover:underline"
                  >
                    Cadastre-se
                  </button>
                </>
              ) : (
                <>
                  Já tem conta?{" "}
                  <button 
                    onClick={() => setMode("login")}
                    className="text-foreground hover:underline"
                  >
                    Entrar
                  </button>
                </>
              )}
            </p>
          )}
        </div>

        {/* Bottom spacer */}
        <div className="mt-auto" />
      </div>

      {/* Right side - Image Carousel (Desktop) */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
        className="hidden lg:block flex-1 relative overflow-hidden"
      >
        <ImageCarousel />
      </motion.div>
    </div>
  );
};

export default Auth;
