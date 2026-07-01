"use server";

import { createClient } from "@/lib/supabase/server";
import { handleDbError } from "@/lib/supabase/errors";
import { splitAmountAcrossDays } from "@/lib/calculations";
import { revalidatePath } from "next/cache";

function revalidateAll() {
  revalidatePath("/dashboard");
  revalidatePath("/master");
  revalidatePath("/master/lancamentos");
}

/** Lança um valor total dividido igualmente entre os dias selecionados.
 * Usado tanto pela profissional (para si mesma) quanto pelo Master (para qualquer profissional). */
export async function saveDailyEntries(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada. Faça login novamente." };

  const professionalId = String(formData.get("professionalId") || "");
  const datesRaw = String(formData.get("dates") || "[]");
  const totalAmount = Number(formData.get("totalAmount"));
  const observation = String(formData.get("observation") || "").trim() || null;

  let dates: string[] = [];
  try {
    dates = JSON.parse(datesRaw);
  } catch {
    return { error: "Datas inválidas." };
  }

  if (!professionalId || dates.length === 0 || Number.isNaN(totalAmount) || totalAmount < 0) {
    return { error: "Preencha profissional, ao menos um dia e um valor válido." };
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const amounts = splitAmountAcrossDays(totalAmount, dates.length);

  const rows = dates.map((date, i) => ({
    professional_id: professionalId,
    entry_date: date,
    amount: amounts[i],
    observation,
    created_by: user.id,
    created_by_role: profile?.role ?? "profissional",
  }));

  const { error } = await supabase
    .from("daily_entries")
    .upsert(rows, { onConflict: "professional_id,entry_date" });

  if (error) return { error: handleDbError("saveDailyEntries", error) };

  revalidateAll();
  return { success: true };
}

export async function deleteDailyEntry(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  const id = String(formData.get("id") || "");
  if (!id) return { error: "Lançamento inválido." };

  const { error } = await supabase.from("daily_entries").delete().eq("id", id);
  if (error) return { error: handleDbError("deleteDailyEntry", error) };

  revalidateAll();
  return { success: true };
}

/** Libera ou bloqueia manualmente um dia específico no calendário de uma profissional. */
export async function toggleWorkDay(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  const professionalId = String(formData.get("professionalId") || "");
  const date = String(formData.get("date") || "");
  const isWorkingDay = formData.get("isWorkingDay") === "true";

  if (!professionalId || !date) return { error: "Dados incompletos." };

  const { data: existing, error: selectError } = await supabase
    .from("professional_work_days")
    .select("id")
    .eq("professional_id", professionalId)
    .eq("work_date", date)
    .maybeSingle();

  if (selectError) return { error: handleDbError("toggleWorkDay:select", selectError) };

  const { error } = await supabase.from("professional_work_days").upsert(
    {
      id: existing?.id,
      professional_id: professionalId,
      work_date: date,
      is_working_day: isWorkingDay,
      changed_by: user.id,
    },
    { onConflict: "professional_id,work_date" }
  );

  if (error) return { error: handleDbError("toggleWorkDay:upsert", error) };

  revalidateAll();
  return { success: true };
}

/** Lançamento em massa: várias profissionais, um ou mais dias, um valor total por profissional
 * (dividido igualmente entre os dias selecionados). Exclusivo do Master. */
export async function massEntry(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "master") return { error: "Apenas o Master pode fazer lançamento em massa." };

  const datesRaw = String(formData.get("dates") || "[]");
  const entriesRaw = String(formData.get("entries") || "[]");
  const observation = String(formData.get("observation") || "").trim() || null;

  let dates: string[] = [];
  let entries: { professionalId: string; amount: number }[] = [];
  try {
    dates = JSON.parse(datesRaw);
    entries = JSON.parse(entriesRaw);
  } catch {
    return { error: "Dados inválidos." };
  }

  const valid = entries.filter((e) => e.professionalId && e.amount > 0);
  if (dates.length === 0 || valid.length === 0) {
    return { error: "Selecione ao menos um dia e informe valor para ao menos uma profissional." };
  }

  const rows: {
    professional_id: string;
    entry_date: string;
    amount: number;
    observation: string | null;
    created_by: string;
    created_by_role: string;
  }[] = [];

  for (const e of valid) {
    const amounts = splitAmountAcrossDays(e.amount, dates.length);
    dates.forEach((date, i) => {
      rows.push({
        professional_id: e.professionalId,
        entry_date: date,
        amount: amounts[i],
        observation,
        created_by: user.id,
        created_by_role: "master",
      });
    });
  }

  const { error } = await supabase
    .from("daily_entries")
    .upsert(rows, { onConflict: "professional_id,entry_date" });

  if (error) return { error: handleDbError("massEntry", error) };

  revalidateAll();
  return { success: true, count: rows.length };
}
