import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";

const secretSequence = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown"];

export function ThemeShortcut() {
  const { resolvedTheme, setTheme } = useTheme();
  const keys = useRef<string[]>([]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select")) return;

      keys.current = [...keys.current, event.key].slice(-secretSequence.length);
      if (keys.current.join("|") !== secretSequence.join("|")) return;

      setTheme(resolvedTheme === "dark" ? "light" : "dark");
      keys.current = [];
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [resolvedTheme, setTheme]);

  return null;
}
