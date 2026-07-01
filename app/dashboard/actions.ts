"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateProgress(formData: FormData) {
  const professionalId = String(formData.get("professionalId"));
  const month = Number(formData.get("month"));
  const year = Number(formData.get("year"));
  const newValue = Number(formData.get("amount"));

  if (Number.isNaN(newValue) || newValue < 0) {
    return { error: "Valor inválido." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  const { data: existing } = await supabase
    .from("goal_progress")
    .select("id, amount_done")
    .eq("professional_id", professionalId)
    .eq("month", month)
    .eq("year", year)
    .maybeSingle();

  const previousValue = existing?.amount_done ?? 0;

  const { error } = await supabase.from("goal_progress").upsert(
    {
      id: existing?.id,
      professional_id: professionalId,
      month,
      year,
      amount_done: newValue,
      updated_by: user.id,
    },
    { onConflict: "professional_id,month,year" }
  );

  if (error) return { error: "Não foi possível salvar. O mês pode estar bloqueado." };

  await supabase.from("change_history").insert({
    user_id: user.id,
    action: "update_progress",
    entity_type: "goal_progress",
    entity_id: existing?.id ?? null,
    previous_value: { amount_done: previousValue },
    new_value: { amount_done: newValue },
  });

  revalidatePath("/dashboard");
  return { success: true };
}
