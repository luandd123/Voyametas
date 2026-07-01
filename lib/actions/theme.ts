"use server";

import { createClient } from "@/lib/supabase/server";

export async function setTheme(formData: FormData) {
  const theme = String(formData.get("theme"));
  if (theme !== "light" && theme !== "dark") return { error: "Tema inválido." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_my_theme", { p_theme: theme });
  if (error) {
    console.error("[setTheme]", error);
    return { error: "Não foi possível salvar a preferência de tema." };
  }
  return { success: true };
}
