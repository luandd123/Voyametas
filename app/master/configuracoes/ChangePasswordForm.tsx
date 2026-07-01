"use client";

import { useState, useTransition, useRef } from "react";
import { changePassword } from "./actions";

export default function ChangePasswordForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function handleSubmit(formData: FormData) {
    setMessage(null);
    startTransition(async () => {
      const result = await changePassword(formData);
      setMessage(result?.error ?? "Senha alterada com sucesso.");
      if (!result?.error) formRef.current?.reset();
    });
  }

  return (
    <form ref={formRef} action={handleSubmit} className="card space-y-3">
      <p className="text-sm font-medium text-voya-charcoal">Alterar minha senha</p>
      <input name="password" type="password" minLength={6} required className="input-field" placeholder="Nova senha" />
      <button type="submit" disabled={isPending} className="btn-primary">
        {isPending ? "Salvando..." : "Alterar senha"}
      </button>
      {message && <p className="text-xs text-voya-charcoal/60">{message}</p>}
    </form>
  );
}
