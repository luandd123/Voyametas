import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Rota raiz: só decide para onde mandar o usuário, com base no papel dele.
export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role === "master") redirect("/master");
  redirect("/dashboard");
}
