import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "@/components/LogoutButton";
import ThemeToggle from "@/components/ThemeToggle";
import MasterNav from "./MasterNav";

export default async function MasterLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, name, theme")
    .eq("id", user.id)
    .single();
  if (!profile || profile.role !== "master") redirect("/dashboard");

  return (
    <div className="min-h-screen bg-voya-cream flex flex-col md:flex-row">
      <aside className="md:w-60 md:h-screen md:sticky md:top-0 bg-voya-surface border-b md:border-b-0 md:border-r border-voya-rose/20 p-4 sm:p-5 flex md:flex-col gap-4">
        <div className="flex-1 min-w-0">
          <h1 className="font-serif text-xl text-voya-charcoal mb-1">Voya</h1>
          <p className="text-xs text-voya-charcoal/50 mb-4 hidden md:block truncate">
            Painel Master · {profile.name}
          </p>
          <MasterNav />
        </div>
        <div className="hidden md:flex md:flex-col gap-2">
          <ThemeToggle initialTheme={profile.theme ?? "light"} />
          <LogoutButton />
        </div>
      </aside>
      <main className="flex-1 p-4 sm:p-6 min-w-0">{children}</main>
    </div>
  );
}
