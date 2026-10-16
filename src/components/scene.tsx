// Cena cinematográfica: pôr do sol sobre um mar de nuvens, com relevo escuro em primeiro
// plano, névoa, grão de filme e vinheta. As imagens são geradas por
// scripts/generate-atmosphere.mjs e animadas só com CSS (ver src/styles/scene.css).
export function Scene({
  variant = "hero",
  fixed = false,
}: {
  variant?: "hero" | "ambient";
  fixed?: boolean;
}) {
  return (
    <div
      className="scene"
      data-variant={variant}
      data-fixed={fixed ? "" : undefined}
      data-parallax=""
      aria-hidden="true"
    >
      <div className="scene-stage">
        <div className="scene-layer scene-sky" />
        <div className="scene-layer scene-rays" />
        <div className="scene-layer scene-sun" />
        <div className="scene-layer scene-clouds" />
        <div className="scene-layer scene-mist" />
        <div className="scene-layer scene-ridge" />
      </div>
      <div className="scene-shade" />
      <div className="scene-grain" />
    </div>
  );
}
