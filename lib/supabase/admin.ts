import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Cliente administrativo (service role). SÓ pode ser importado em código
// que roda no servidor (server actions). Usado para criar/remover usuários
// de login das profissionais, ignorando RLS.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
