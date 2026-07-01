"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

async function requireMaster() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("not authenticated");
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "master") throw new Error("forbidden");
  return { supabase, user };
}

export async function createProfessional(formData: FormData) {
  const { supabase, user } = await requireMaster();

  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");

  if (!name || !email || password.length < 6) {
    return { error: "Preencha nome, e-mail e uma senha com no mínimo 6 caracteres." };
  }

  const { data: professional, error: profError } = await supabase
    .from("professionals")
    .insert({ name })
    .select()
    .single();

  if (profError || !professional) return { error: "Não foi possível criar a profissional." };

  const admin = createAdminClient();
  const { data: created, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, role: "profissional", professional_id: professional.id },
  });

  if (authError || !created.user) {
    // reverte a criação da profissional se o usuário de login falhar
    await supabase.from("professionals").delete().eq("id", professional.id);
    return { error: "Não foi possível criar o login: " + (authError?.message ?? "erro desconhecido") };
  }

  await supabase.from("change_history").insert({
    user_id: user.id,
    action: "create",
    entity_type: "professional",
    entity_id: professional.id,
    previous_value: null,
    new_value: { name, email },
  });

  revalidatePath("/master/profissionais");
  return { success: true };
}

export async function updateProfessional(formData: FormData) {
  const { supabase, user } = await requireMaster();
  const id = String(formData.get("id"));
  const name = String(formData.get("name") || "").trim();
  const active = formData.get("active") === "on";

  const { data: before } = await supabase.from("professionals").select("*").eq("id", id).single();

  const { error } = await supabase.from("professionals").update({ name, active }).eq("id", id);
  if (error) return { error: "Não foi possível atualizar." };

  await supabase.from("change_history").insert({
    user_id: user.id,
    action: "update",
    entity_type: "professional",
    entity_id: id,
    previous_value: before,
    new_value: { name, active },
  });

  revalidatePath("/master/profissionais");
  return { success: true };
}

export async function removeProfessional(formData: FormData) {
  const { supabase, user } = await requireMaster();
  const id = String(formData.get("id"));

  const { data: before } = await supabase.from("professionals").select("*").eq("id", id).single();

  // Remove o login vinculado, se existir
  const { data: linkedProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("professional_id", id)
    .maybeSingle();

  if (linkedProfile) {
    const admin = createAdminClient();
    await admin.auth.admin.deleteUser(linkedProfile.id);
  }

  const { error } = await supabase.from("professionals").delete().eq("id", id);
  if (error) return { error: "Não foi possível remover." };

  await supabase.from("change_history").insert({
    user_id: user.id,
    action: "delete",
    entity_type: "professional",
    entity_id: id,
    previous_value: before,
    new_value: null,
  });

  revalidatePath("/master/profissionais");
  return { success: true };
}
