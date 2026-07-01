"use client";

import { useState, useTransition } from "react";
import { updateProfessional, removeProfessional } from "./actions";
import type { Professional } from "@/lib/types";

export default function ProfessionalRow({ professional }: { professional: Professional }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(professional.name);
  const [active, setActive] = useState(professional.active);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    const fd = new FormData();
    fd.set("id", professional.id);
    fd.set("name", name);
    if (active) fd.set("active", "on");
    startTransition(async () => {
      await updateProfessional(fd);
      setEditing(false);
    });
  }

  function handleRemove() {
    if (!confirm(`Remover ${professional.name}? Isso também remove o login dela.`)) return;
    const fd = new FormData();
    fd.set("id", professional.id);
    startTransition(async () => {
      await removeProfessional(fd);
    });
  }

  return (
    <div className="py-3 flex items-center justify-between gap-3">
      {editing ? (
        <input value={name} onChange={(e) => setName(e.target.value)} className="input-field max-w-xs" />
      ) : (
        <div>
          <p className="font-medium text-sm">{professional.name}</p>
          <p className="text-xs text-voya-charcoal/50">{professional.active ? "Ativa" : "Inativa"}</p>
        </div>
      )}

      <div className="flex items-center gap-2">
        {editing && (
          <label className="text-xs flex items-center gap-1">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            Ativa
          </label>
        )}
        {editing ? (
          <button onClick={handleSave} disabled={isPending} className="btn-primary text-xs px-3 py-1.5">
            Salvar
          </button>
        ) : (
          <button onClick={() => setEditing(true)} className="btn-secondary text-xs px-3 py-1.5">
            Editar
          </button>
        )}
        <button onClick={handleRemove} disabled={isPending} className="text-xs px-3 py-1.5 text-red-600 hover:underline">
          Remover
        </button>
      </div>
    </div>
  );
}
