import { motion } from "framer-motion";
import { Smartphone } from "lucide-react";

interface OrientationSelectorProps {
  value: "vertical" | "horizontal" | "";
  onChange: (value: "vertical" | "horizontal") => void;
}

export const OrientationSelector = ({ value, onChange }: OrientationSelectorProps) => {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground tracking-wider uppercase mb-4">
        Orientação do Vídeo
      </label>
      <div className="flex justify-center gap-8">
        {/* Vertical */}
        <motion.button
          type="button"
          onClick={() => onChange("vertical")}
          className={`relative flex flex-col items-center gap-3 p-6 border transition-all ${
            value === "vertical"
              ? "border-foreground bg-foreground/5"
              : "border-border hover:border-muted-foreground"
          }`}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <motion.div
            className={`relative transition-colors ${
              value === "vertical" ? "text-foreground" : "text-muted-foreground"
            }`}
            animate={{ rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
          >
            {/* Phone frame - vertical */}
            <div className="w-12 h-20 border-2 border-current rounded-lg flex items-center justify-center relative">
              <div className="absolute top-1 w-4 h-1 bg-current rounded-full opacity-50" />
              <Smartphone className="w-5 h-5 opacity-30" />
              <div className="absolute bottom-1 w-3 h-3 border border-current rounded-full opacity-50" />
            </div>
          </motion.div>
          <span className={`text-xs tracking-wider uppercase ${
            value === "vertical" ? "text-foreground font-medium" : "text-muted-foreground"
          }`}>
            Vertical
          </span>
          <span className="text-[10px] text-muted-foreground">9:16</span>
          {value === "vertical" && (
            <motion.div
              layoutId="orientation-indicator"
              className="absolute inset-0 border-2 border-foreground pointer-events-none"
              initial={false}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
          )}
        </motion.button>

        {/* Animação do celular girando no centro */}
        <div className="flex items-center">
          <motion.div
            className="text-muted-foreground/30"
            animate={{ 
              rotate: value === "horizontal" ? 90 : value === "vertical" ? 0 : [0, 90, 0],
            }}
            transition={{ 
              type: "spring", 
              stiffness: 100, 
              damping: 15,
              repeat: value === "" ? Infinity : 0,
              repeatDelay: 1
            }}
          >
            <div className="w-8 h-14 border-2 border-current rounded-md flex items-center justify-center">
              <Smartphone className="w-4 h-4 opacity-50" />
            </div>
          </motion.div>
        </div>

        {/* Horizontal */}
        <motion.button
          type="button"
          onClick={() => onChange("horizontal")}
          className={`relative flex flex-col items-center gap-3 p-6 border transition-all ${
            value === "horizontal"
              ? "border-foreground bg-foreground/5"
              : "border-border hover:border-muted-foreground"
          }`}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <motion.div
            className={`relative transition-colors ${
              value === "horizontal" ? "text-foreground" : "text-muted-foreground"
            }`}
            animate={{ rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
          >
            {/* Phone frame - horizontal (rotated) */}
            <div className="w-20 h-12 border-2 border-current rounded-lg flex items-center justify-center relative">
              <div className="absolute left-1 h-4 w-1 bg-current rounded-full opacity-50" />
              <Smartphone className="w-5 h-5 opacity-30 rotate-90" />
              <div className="absolute right-1 w-3 h-3 border border-current rounded-full opacity-50" />
            </div>
          </motion.div>
          <span className={`text-xs tracking-wider uppercase ${
            value === "horizontal" ? "text-foreground font-medium" : "text-muted-foreground"
          }`}>
            Horizontal
          </span>
          <span className="text-[10px] text-muted-foreground">16:9</span>
          {value === "horizontal" && (
            <motion.div
              layoutId="orientation-indicator"
              className="absolute inset-0 border-2 border-foreground pointer-events-none"
              initial={false}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
          )}
        </motion.button>
      </div>
    </div>
  );
};
