"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { sair } from "../(auth)/actions";

const ITENS = [
  { href: "/admin/frequencias", label: "Frequências" },
  { href: "/admin/presencas", label: "Presenças" },
  { href: "/admin/certificados", label: "Certificados" },
  { href: "/admin/metricas", label: "Métricas" },
  { href: "/admin/admins", label: "Admins" },
];

export function NavAdmin({ nome, master }: { nome: string; master: boolean }) {
  const path = usePathname();
  return (
    <nav
      aria-label="Menu do admin"
      className="sticky top-0 z-20 flex shrink-0 items-center gap-1.5 overflow-x-auto bg-ink px-3 py-2.5 text-white md:h-dvh md:w-60 md:flex-col md:items-stretch md:gap-1.5 md:overflow-visible md:px-4 md:py-6"
    >
      <Link href="/admin" className="flex shrink-0 items-center gap-2.5 pr-1.5 md:px-2 md:pb-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-[9px] bg-primary font-display text-[13px] font-bold">JES</span>
        <span className="hidden flex-col md:flex">
          <span className="font-display text-base font-bold">Frequência</span>
          <span className="text-xs text-[#b8becb]">Painel do admin</span>
        </span>
      </Link>
      {ITENS.map((i) => {
        const ativo = path.startsWith(i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={ativo ? "page" : undefined}
            className={`flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-[10px] px-3.5 font-semibold ${
              ativo ? "bg-primary text-white" : "text-[#d5d9e2] hover:bg-white/10"
            }`}
          >
            {i.label}
          </Link>
        );
      })}
      <div className="hidden flex-col gap-3 border-t border-[#2e3442] px-2 pt-4 md:mt-auto md:flex">
        <div className="flex flex-col">
          <span className="font-semibold">{nome}</span>
          <span className="text-xs text-[#b8becb]">{master ? "Admin master" : "Admin"}</span>
        </div>
        <div className="flex gap-2">
          <Link href="/inicio" className="text-sm font-semibold text-[#d5d9e2] hover:text-white">
            Área do participante
          </Link>
        </div>
        <form action={sair}>
          <button className="text-sm font-semibold text-[#d5d9e2] hover:text-white">Sair</button>
        </form>
      </div>
      <form action={sair} className="shrink-0 md:hidden">
        <button className="min-h-11 whitespace-nowrap rounded-[10px] px-3 font-semibold text-[#d5d9e2]">Sair</button>
      </form>
    </nav>
  );
}
