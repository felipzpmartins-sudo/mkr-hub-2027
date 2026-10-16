"use client";
import { useEffect } from "react";

// Dois efeitos leves guiados pelo ponteiro, ambos só via variáveis CSS:
// - [data-parallax]: --px/--py (-1..1) deslocam as camadas da cena;
// - [data-spotlight]: --mx/--my posicionam o brilho que segue o cursor nos cartões.
// As variáveis ficam nos próprios elementos para não invalidar o estilo da página toda.
export function PointerFx() {
  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!fine.matches || reduced.matches) return;
    let frame = 0;
    let x = 0;
    let y = 0;
    let target: EventTarget | null = null;
    const apply = () => {
      frame = 0;
      const px = ((x / window.innerWidth) * 2 - 1).toFixed(3);
      const py = ((y / window.innerHeight) * 2 - 1).toFixed(3);
      for (const scene of document.querySelectorAll<HTMLElement>("[data-parallax]")) {
        scene.style.setProperty("--px", px);
        scene.style.setProperty("--py", py);
      }
      const card =
        target instanceof Element ? target.closest<HTMLElement>("[data-spotlight]") : null;
      if (card) {
        const box = card.getBoundingClientRect();
        card.style.setProperty("--mx", `${x - box.left}px`);
        card.style.setProperty("--my", `${y - box.top}px`);
      }
    };
    const onMove = (event: PointerEvent) => {
      x = event.clientX;
      y = event.clientY;
      target = event.target;
      if (!frame) frame = requestAnimationFrame(apply);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
  return null;
}
