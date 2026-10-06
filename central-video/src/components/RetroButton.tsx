import { motion } from "framer-motion";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface RetroButtonProps {
  children: ReactNode;
  variant?: "primary" | "secondary" | "accent" | "danger" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit" | "reset";
}

const variants = {
  primary: "bg-foreground text-background hover:bg-foreground/90",
  secondary: "bg-muted text-foreground hover:bg-muted/80",
  accent: "bg-foreground text-background hover:bg-foreground/90 border border-foreground",
  danger: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  outline: "bg-transparent border border-border text-foreground hover:bg-muted",
  ghost: "bg-transparent text-foreground hover:bg-muted",
};

const sizes = {
  sm: "px-4 py-2 text-xs",
  md: "px-6 py-3 text-sm",
  lg: "px-8 py-4 text-sm",
};

export function RetroButton({
  children,
  variant = "primary",
  size = "md",
  onClick,
  disabled = false,
  className,
  type = "button",
}: RetroButtonProps) {
  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className={cn(
        "font-medium tracking-wide transition-all duration-300",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className
      )}
    >
      {children}
    </motion.button>
  );
}
