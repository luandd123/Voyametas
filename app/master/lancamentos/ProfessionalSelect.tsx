"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { Professional } from "@/lib/types";

export default function ProfessionalSelect({ professionals }: { professionals: Professional[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (id) params.set("prof", id);
    else params.delete("prof");
    router.push(`/master/lancamentos?${params.toString()}`);
  }

  return (
    <select
      className="input-field sm:max-w-xs"
      defaultValue={searchParams.get("prof") ?? ""}
      onChange={(e) => handleChange(e.target.value)}
    >
      <option value="">Selecione uma profissional...</option>
      {professionals.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  );
}
