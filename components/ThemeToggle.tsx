"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setTheme } from "@/lib/actions/theme";
import type { Theme } from "@/lib/types";

export default function ThemeToggle({ initialTheme }: { initialTheme: Theme }) {
  const [theme, setThemeState] = useState<Theme>(initialTheme);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setThemeState(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    const fd = new FormData();
    fd.set("theme", next);
    startTransition(async () => {
      await setTheme(fd);
      router.refresh();
    });
  }

  return (
    <button
      onClick={toggle}
      disabled={isPending}
      className="btn-secondary w-full flex items-center justify-center gap-2 text-xs"
      type="button"
    >
      {theme === "dark" ? "☀️ Tema claro" : "🌙 Tema escuro"}
    </button>
  );
}
