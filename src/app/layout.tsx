import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import { PointerFx } from "@/components/pointer-fx";
import "./globals.css";

// Archivo é variável em largura (wdth) e peso: a largura expandida dá o ar "extended"
// dos títulos gigantes, e a largura normal serve para o texto corrido.
const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-archivo",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "MKR HUB · Workspace", template: "%s · MKR HUB" },
  description: "Todos os seus sistemas em um só lugar.",
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { themeColor: "#0b0908", colorScheme: "dark" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={archivo.variable} data-scroll-behavior="smooth">
      <body>
        <a href="#main-content" className="skip-link">
          Pular para o conteúdo
        </a>
        {children}
        <PointerFx />
      </body>
    </html>
  );
}
