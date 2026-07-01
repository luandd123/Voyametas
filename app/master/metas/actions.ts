"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function saveGoal(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  const professionalId = String(formData.get("professionalId"));
  const month = Number(formData.get("month"));
  const year = Number(formData.get("year"));
  const initialGoal = Number(formData.get("initialGoal"));
  const generalGoal = Number(formData.get("generalGoal"));

  if (!professionalId || !month || !year || Number.isNaN(initialGoal) || Number.isNaN(generalGoal)) {
    return { error: "Preencha todos os campos corretamente." };
  }

  const { data: before } = await supabase
    .from("monthly_goals")
    .select("*")
    .eq("professional_id", professionalId)
    .eq("month", month)
    .eq("year", year)
    .maybeSingle();

  const { error } = await supabase.from("monthly_goals").upsert(
    {
      id: before?.id,
      professional_id: professionalId,
      month,
      year,
      initial_goal: initialGoal,
      general_goal: generalGoal,
    },
    { onConflict: "professional_id,month,year" }
  );

  if (error) return { error: "Não foi possível salvar a meta." };

  await supabase.from("change_history").insert({
    user_id: user.id,
    action: before ? "update" : "create",
    entity_type: "monthly_goal",
    entity_id: before?.id ?? null,
    previous_value: before ?? null,
    new_value: { initial_goal: initialGoal, general_goal: generalGoal },
  });

  revalidatePath("/master/metas");
  return { success: true };
}
