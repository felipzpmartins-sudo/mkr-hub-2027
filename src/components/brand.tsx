import { Layers3 } from "lucide-react";
export function Brand({ large = false }: { large?: boolean }) {
  return (
    <span className={`brand ${large ? "brand-large" : ""}`}>
      <span className="brand-mark">
        <Layers3 size={large ? 25 : 21} strokeWidth={2.1} />
      </span>
      <span>
        MKR <strong>HUB</strong>
      </span>
    </span>
  );
}
