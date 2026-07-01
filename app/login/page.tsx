"use client";

import { useState, useTransition } from "react";
import { signIn } from "./actions";

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await signIn(formData);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-voya-cream px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="font-serif text-3xl text-voya-charcoal tracking-wide">Voya</h1>
          <p className="text-sm text-voya-charcoal/60 mt-1">Controle de metas mensais</p>
        </div>

        <form action={handleSubmit} className="card space-y-4">
          <div>
            <label className="label-field">Usuário (e-mail)</label>
            <input
              name="email"
              type="email"
              required
              className="input-field"
              placeholder="voce@voya.com"
            />
          </div>
          <div>
            <label className="label-field">Senha</label>
            <input name="password" type="password" required className="input-field" />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button type="submit" disabled={isPending} className="btn-primary w-full">
            {isPending ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
