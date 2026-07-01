"use server";

import { createClient } from "@/lib/supabase/server";

export async function changePassword(formData: FormData) {
  const password = String(formData.get("password") || "");
  if (password.length < 6) return { error: "A senha precisa ter ao menos 6 caracteres." };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: "Não foi possível alterar a senha." };
  return { success: true };
}
