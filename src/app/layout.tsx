import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: { default: "MKR HUB · Workspace", template: "%s · MKR HUB" },
  description: "Todos os seus sistemas em um só lugar.",
  robots: { index: false, follow: false },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <a href="#main-content" className="skip-link">
          Pular para o conteúdo
        </a>
        {children}
      </body>
    </html>
  );
}
