import { motion } from "framer-motion";

interface PixelIconProps {
  icon: "rocket" | "star" | "heart" | "sword" | "shield" | "controller" | "video" | "user" | "team" | "captain";
  size?: number;
  className?: string;
  animated?: boolean;
}

const icons = {
  rocket: (
    <path d="M8 0h4v2h2v2h2v4h-2v2h-2v2H8v-2H6V8H4V4h2V2h2V0zm2 4h-2v4h4V4h-2z" fill="currentColor" />
  ),
  star: (
    <path d="M8 0h4v2h2v2h2v4h-2v2h-2v4h-4v-4H6v-2H4V4h2V2h2V0z" fill="currentColor" />
  ),
  heart: (
    <path d="M2 4h4V2h4v2h4v4h-2v2h-2v2H8v-2H6V8H4V4H2z" fill="currentColor" />
  ),
  sword: (
    <path d="M12 0h4v4h-2v2h-2v2h-2v2H8v2H6v2H4v2H2v-2H0v-2h2v-2h2v-2h2V8h2V6h2V4h2V0z" fill="currentColor" />
  ),
  shield: (
    <path d="M4 0h8v2h2v6h-2v4h-2v2H6v-2H4V8H2V2h2V0z" fill="currentColor" />
  ),
  controller: (
    <path d="M4 4h8v2h2v6h-2v2H4v-2H2V6h2V4zm2 2v2H4v2h2v2h4v-2h2V8h-2V6H6z" fill="currentColor" />
  ),
  video: (
    <path d="M2 4h10v2h2v2h2v4h-2v2h-2v2H2v-2H0V6h2V4zm2 2v6h6v-2h2V8h-2V6H4z" fill="currentColor" />
  ),
  user: (
    <path d="M6 2h4v4H6V2zM4 8h8v2h2v4H2v-4h2V8z" fill="currentColor" />
  ),
  team: (
    <path d="M2 2h3v3H2V2zm9 0h3v3h-3V2zM0 7h5v2h1v3H0V7zm10 0h5v5h-6V9h1V7zM5 8h6v2H5V8z" fill="currentColor" />
  ),
  captain: (
    <path d="M6 0h4v2H6V0zM4 2h2v2H4V2zm6 0h2v2h-2V2zM2 4h2v2H2V4zm10 0h2v2h-2V4zM0 6h16v2H0V6zm2 4h12v2H2v-2zm2 4h8v2H4v-2z" fill="currentColor" />
  ),
};

export function PixelIcon({ icon, size = 16, className = "", animated = false }: PixelIconProps) {
  if (animated) {
    return (
      <motion.svg
        width={size}
        height={size}
        viewBox="0 0 16 16"
        className={className}
        style={{ imageRendering: "pixelated" }}
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" as const }}
      >
        {icons[icon]}
      </motion.svg>
    );
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      className={className}
      style={{ imageRendering: "pixelated" }}
    >
      {icons[icon]}
    </svg>
  );
}
