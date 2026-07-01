"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const NAV = [
  { href: "/master", label: "Visão geral" },
  { href: "/master/lancamentos", label: "Lançamentos" },
  { href: "/master/profissionais", label: "Profissionais" },
  { href: "/master/metas", label: "Metas" },
  { href: "/master/meses", label: "Liberar meses" },
  { href: "/master/historico", label: "Histórico" },
  { href: "/master/configuracoes", label: "Configurações" },
];

export default function MasterNav() {
  const pathname = usePathname();

  return (
    <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-1 md:pb-0">
      {NAV.map((item) => {
        const active = item.href === "/master" ? pathname === "/master" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              "text-sm px-3 py-2 rounded-lg whitespace-nowrap transition",
              active
                ? "bg-voya-roseDark text-white font-medium"
                : "hover:bg-voya-cream text-voya-charcoal/80"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
