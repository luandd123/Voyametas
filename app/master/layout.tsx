import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/LogoutButton";

const NAV = [
  { href: "/master", label: "Visão geral" },
  { href: "/master/profissionais", label: "Profissionais" },
  { href: "/master/metas", label: "Metas" },
  { href: "/master/meses", label: "Liberar meses" },
  { href: "/master/historico", label: "Histórico" },
  { href: "/master/configuracoes", label: "Configurações" },
];

export default async function MasterLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("role, name").eq("id", user.id).single();
  if (!profile || profile.role !== "master") redirect("/dashboard");

  return (
    <div className="min-h-screen bg-voya-cream flex flex-col md:flex-row">
      <aside className="md:w-60 bg-white border-b md:border-b-0 md:border-r border-voya-rose/20 p-5 flex md:flex-col gap-4">
        <div className="flex-1">
          <h1 className="font-serif text-xl text-voya-charcoal mb-1">Voya</h1>
          <p className="text-xs text-voya-charcoal/50 mb-5 hidden md:block">Painel Master · {profile.name}</p>
          <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm px-3 py-2 rounded-lg hover:bg-voya-cream text-voya-charcoal/80 whitespace-nowrap"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="hidden md:block">
          <LogoutButton />
        </div>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
