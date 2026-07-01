import type { PostgrestError } from "@supabase/supabase-js";

/**
 * Traduz um erro do Postgres/Supabase em uma mensagem segura para a interface,
 * sempre logando o erro real no servidor (console.error) para diagnóstico.
 *
 * Nunca expõe SQL, nomes de coluna/tabela ou detalhes internos ao usuário final.
 */
export function handleDbError(context: string, error: PostgrestError): string {
  console.error(`[${context}]`, {
    message: error.message,
    code: error.code,
    details: error.details,
    hint: error.hint,
  });

  // 42501 = insufficient_privilege (violação de política de RLS)
  if (error.code === "42501") {
    return "Você não tem permissão para salvar isso agora. O mês pode estar bloqueado, ou fale com o Master.";
  }

  // 23505 = unique_violation
  if (error.code === "23505") {
    return "Já existe um lançamento para essa data. Tente atualizar em vez de criar um novo.";
  }

  // 23503 = foreign_key_violation
  if (error.code === "23503") {
    return "Não foi possível salvar: referência inválida (profissional ou período inexistente).";
  }

  return "Não foi possível salvar. Tente novamente em instantes ou contate o suporte.";
}
