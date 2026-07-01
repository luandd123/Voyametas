import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Voya | Controle de Metas",
  description: "Sistema interno de controle de metas mensais da equipe Voya",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
