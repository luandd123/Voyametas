import { createClient } from "@/lib/supabase/server";
import ChangePasswordForm from "./ChangePasswordForm";

export default async function ConfiguracoesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user!.id).single();

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <p className="text-xs text-voya-charcoal/50">Sistema</p>
        <h1 className="font-serif text-2xl text-voya-charcoal">Configurações</h1>
      </div>

      <div className="card">
        <p className="text-sm font-medium text-voya-charcoal mb-3">Conta Master</p>
        <p className="text-sm text-voya-charcoal/70">Nome: {profile?.name}</p>
        <p className="text-sm text-voya-charcoal/70">E-mail: {profile?.email}</p>
      </div>

      <ChangePasswordForm />

      <div className="card text-xs text-voya-charcoal/50">
        Voya · Sistema interno de controle de metas mensais. Para adicionar mais opções de
        configuração (nome da empresa, tolerância do indicador de ritmo, etc.), crie uma tabela
        <code className="mx-1 bg-voya-cream px-1 rounded">settings</code>
        e uma nova seção aqui.
      </div>
    </div>
  );
}
