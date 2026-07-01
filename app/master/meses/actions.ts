"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function toggleMonthLock(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  const month = Number(formData.get("month"));
  const year = Number(formData.get("year"));
  const isUnlocked = formData.get("isUnlocked") === "true";

  const { data: before } = await supabase
    .from("month_locks")
    .select("*")
    .eq("month", month)
    .eq("year", year)
    .maybeSingle();

  const { error } = await supabase.from("month_locks").upsert(
    {
      id: before?.id,
      month,
      year,
      is_unlocked: isUnlocked,
      unlocked_by: user.id,
    },
    { onConflict: "month,year" }
  );

  if (error) return { error: "Não foi possível atualizar o mês." };

  await supabase.from("change_history").insert({
    user_id: user.id,
    action: isUnlocked ? "unlock_month" : "lock_month",
    entity_type: "month_lock",
    entity_id: before?.id ?? null,
    previous_value: before,
    new_value: { month, year, is_unlocked: isUnlocked },
  });

  revalidatePath("/master/meses");
  return { success: true };
}
