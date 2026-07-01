import type { Metadata } from "next";
import "./globals.css";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Voya | Controle de Metas",
  description: "Sistema interno de controle de metas mensais da equipe Voya",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let theme: "light" | "dark" = "light";
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("theme")
      .eq("id", user.id)
      .maybeSingle();
    if (profile?.theme === "dark") theme = "dark";
  }

  return (
    <html lang="pt-BR" className={theme === "dark" ? "dark" : undefined}>
      <body className="font-sans antialiased bg-voya-cream text-voya-charcoal min-h-screen">
        {children}
      </body>
    </html>
  );
}
