"use client";

import { useState, useTransition, useRef } from "react";
import { createProfessional } from "./actions";

export default function ProfessionalForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    setMessage(null);
    startTransition(async () => {
      const result = await createProfessional(formData);
      if (result?.error) setMessage(result.error);
      else {
        setMessage("Profissional criada com sucesso.");
        formRef.current?.reset();
      }
    });
  }

  return (
    <form ref={formRef} action={handleSubmit} className="card space-y-3">
      <p className="text-sm font-medium text-voya-charcoal">Adicionar nova profissional</p>
      <div className="grid md:grid-cols-3 gap-3">
        <div>
          <label className="label-field">Nome</label>
          <input name="name" required className="input-field" placeholder="Nome completo" />
        </div>
        <div>
          <label className="label-field">E-mail (login)</label>
          <input name="email" type="email" required className="input-field" placeholder="nome@voya.com" />
        </div>
        <div>
          <label className="label-field">Senha inicial</label>
          <input name="password" type="password" required minLength={6} className="input-field" />
        </div>
      </div>
      <button type="submit" disabled={isPending} className="btn-primary">
        {isPending ? "Criando..." : "Criar profissional"}
      </button>
      {message && <p className="text-xs text-voya-charcoal/60">{message}</p>}
    </form>
  );
}
