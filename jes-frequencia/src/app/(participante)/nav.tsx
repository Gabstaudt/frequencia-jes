"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icone } from "@/components/ui";

export function NavInferior() {
  const path = usePathname();
  const itens = [
    { href: "/inicio", label: "Frequências", icone: "lista" as const },
    { href: "/certificados", label: "Certificados", icone: "medalha" as const },
  ];
  return (
    <nav aria-label="Navegação" className="fixed inset-x-0 bottom-0 border-t border-line bg-white pb-[max(env(safe-area-inset-bottom),12px)]">
      <div className="mx-auto flex max-w-md px-3 pt-1.5">
        {itens.map((i) => {
          const ativo = path.startsWith(i.href);
          return (
            <Link
              key={i.href}
              href={i.href}
              aria-current={ativo ? "page" : undefined}
              className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-xs font-semibold ${ativo ? "text-primary" : "text-muted"}`}
            >
              <Icone nome={i.icone} className="h-[22px] w-[22px]" />
              {i.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
