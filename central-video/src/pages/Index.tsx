import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Play } from "lucide-react";
import ImageCarousel from "@/components/ImageCarousel";


const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Image Carousel - Right Side */}
      <div className="absolute top-0 right-0 w-1/2 h-full hidden md:block">
        <ImageCarousel />
      </div>

      {/* Subtle grain texture overlay */}
      <div 
        className="absolute inset-0 opacity-[0.015] pointer-events-none z-20"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Main content */}
      <div className="relative z-10 container mx-auto px-6 min-h-screen flex flex-col md:w-1/2 md:ml-0 md:mr-auto">
        {/* Header */}
        <motion.header 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="py-8 flex justify-between items-center"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 border border-border flex items-center justify-center">
              <Play className="w-4 h-4 text-foreground" fill="currentColor" />
            </div>
            <span className="text-sm font-light tracking-[0.3em] uppercase text-foreground">
              Central
            </span>
          </div>
          <div className="flex items-center gap-4">
            
            <button 
              onClick={() => navigate("/auth")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-300"
            >
              Entrar
            </button>
          </div>
        </motion.header>

        {/* Hero section */}
        <div className="flex-1 flex flex-col justify-center max-w-xl">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
          >
            {/* Overline */}
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="text-muted-foreground text-sm tracking-[0.2em] uppercase mb-6"
            >
              Produção de Vídeos
            </motion.p>

            {/* Main heading */}
            <motion.h1 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-5xl md:text-6xl lg:text-7xl font-extralight text-foreground leading-[0.95] mb-8"
            >
              Solicite.
              <br />
              <span className="text-muted-foreground">Acompanhe.</span>
              <br />
              Receba.
            </motion.h1>

            {/* Description */}
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5 }}
              className="text-muted-foreground text-lg md:text-xl font-light max-w-lg mb-12 leading-relaxed"
            >
              Uma plataforma elegante para gerenciar suas solicitações de edição de vídeo.
            </motion.p>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <button 
                onClick={() => navigate("/auth")}
                className="group inline-flex items-center gap-4 bg-foreground text-background px-8 py-4 text-sm font-medium tracking-wide hover:bg-foreground/90 transition-all duration-300"
              >
                Fazer Solicitação
                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform duration-300" />
              </button>
              <button 
                onClick={() => navigate("/auth")}
                className="inline-flex items-center gap-4 border border-border text-foreground px-8 py-4 text-sm font-medium tracking-wide hover:bg-muted transition-all duration-300"
              >
                Acessar Conta
              </button>
            </motion.div>
          </motion.div>
        </div>

        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="py-8 flex justify-between items-center border-t border-border"
        >
          <p className="text-xs text-muted-foreground tracking-wider">
            © 2024 Central de Vídeos
          </p>
          <div className="flex gap-8">
            {["Sobre", "Contato", "Termos"].map((item) => (
              <button 
                key={item}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-300 tracking-wider"
              >
                {item}
              </button>
            ))}
          </div>
        </motion.footer>
      </div>
    </div>
  );
};

export default Index;
