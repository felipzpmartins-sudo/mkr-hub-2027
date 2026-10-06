import { motion } from "framer-motion";

// Plataformas e seus formatos compatíveis
const platforms = {
  Instagram: {
    icon: "📸",
    formats: ["Story", "Post", "Reels"],
  },
  TikTok: {
    icon: "🎵",
    formats: ["Vídeo TikTok"],
  },
  YouTube: {
    icon: "▶️",
    formats: ["Shorts", "Vídeo Tradicional"],
  },
  Diversos: {
    icon: "🌐",
    formats: ["Multiplataforma", "Adaptável"],
  },
};

interface PlatformSelectorProps {
  platform: string;
  format: string;
  onPlatformChange: (platform: string) => void;
  onFormatChange: (format: string) => void;
}

export const PlatformSelector = ({
  platform,
  format,
  onPlatformChange,
  onFormatChange,
}: PlatformSelectorProps) => {
  const selectedPlatformData = platform ? platforms[platform as keyof typeof platforms] : null;

  const handlePlatformClick = (name: string) => {
    console.log("Platform clicked:", name);
    onPlatformChange(name);
    onFormatChange("");
  };

  const handleFormatClick = (formatOption: string) => {
    console.log("Format clicked:", formatOption);
    onFormatChange(formatOption);
  };

  return (
    <div className="space-y-6">
      {/* Seleção de Plataforma */}
      <div>
        <label className="block text-xs font-medium text-muted-foreground tracking-wider uppercase mb-4">
          Plataforma de Destino
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(platforms).map(([name, data]) => (
            <button
              key={name}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handlePlatformClick(name);
              }}
              className={`relative flex flex-col items-center gap-2 p-4 border transition-all cursor-pointer select-none z-10 ${
                platform === name
                  ? "border-foreground bg-foreground/5"
                  : "border-border hover:border-muted-foreground bg-background"
              }`}
            >
              <span className="text-2xl pointer-events-none">{data.icon}</span>
              <span className={`text-xs tracking-wider pointer-events-none ${
                platform === name ? "text-foreground font-medium" : "text-muted-foreground"
              }`}>
                {name}
              </span>
              {platform === name && (
                <div className="absolute inset-0 border-2 border-foreground pointer-events-none" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Seleção de Formato - aparece apenas quando uma plataforma é selecionada */}
      {selectedPlatformData && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
        >
          <label className="block text-xs font-medium text-muted-foreground tracking-wider uppercase mb-4">
            Formato do Vídeo
          </label>
          <div className={`grid gap-3 ${
            selectedPlatformData.formats.length === 1 
              ? "grid-cols-1" 
              : selectedPlatformData.formats.length === 2 
                ? "grid-cols-2" 
                : "grid-cols-3"
          }`}>
            {selectedPlatformData.formats.map((formatOption) => (
              <button
                key={formatOption}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleFormatClick(formatOption);
                }}
                className={`relative p-4 border transition-all text-center cursor-pointer select-none z-10 ${
                  format === formatOption
                    ? "border-foreground bg-foreground/5"
                    : "border-border hover:border-muted-foreground bg-background"
                }`}
              >
                <span className={`text-sm pointer-events-none ${
                  format === formatOption ? "text-foreground font-medium" : "text-muted-foreground"
                }`}>
                  {formatOption}
                </span>
                {format === formatOption && (
                  <div className="absolute inset-0 border-2 border-foreground pointer-events-none" />
                )}
              </button>
            ))}
          </div>
          
          {/* Dica visual do formato selecionado */}
          {format && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-muted-foreground mt-3 text-center"
            >
              {platform} • {format}
            </motion.p>
          )}
        </motion.div>
      )}
    </div>
  );
};