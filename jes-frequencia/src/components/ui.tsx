import Link from "next/link";

export function Logo({ compacto = false }: { compacto?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label="Frequência JES, início">
      <span className="flex h-9 w-9 items-center justify-center rounded-[9px] bg-primary font-display text-[13px] font-bold text-white">
        JES
      </span>
      {!compacto && <span className="font-display text-[17px] font-bold">Frequência</span>}
    </Link>
  );
}

/** Coluna estreita, pensada para celular, usada nas telas de conta. */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 pb-10 pt-8">
      <header className="mb-8">
        <Logo />
      </header>
      <main className="flex flex-1 flex-col gap-5">{children}</main>
    </div>
  );
}

export function Icone({ nome, className = "h-5 w-5" }: { nome: keyof typeof ICONES; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {ICONES[nome]}
    </svg>
  );
}

const ICONES = {
  check: <path d="M5 12l5 5L20 7" />,
  voltar: <path d="M15 18l-6-6 6-6" />,
  cadeado: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </>
  ),
  alerta: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5M12 16h.01" />
    </>
  ),
  menos: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12h8" />
    </>
  ),
  email: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </>
  ),
  lista: (
    <>
      <path d="M9 11l3 3 8-8" />
      <path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9" />
    </>
  ),
  medalha: (
    <>
      <circle cx="12" cy="9" r="6" />
      <path d="M8.5 14L7 22l5-3 5 3-1.5-8" />
    </>
  ),
  relogio: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </>
  ),
  x: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M15 9l-6 6M9 9l6 6" />
    </>
  ),
  upload: (
    <>
      <path d="M12 16V4" />
      <path d="M7 9l5-5 5 5" />
      <path d="M4 20h16" />
    </>
  ),
};

export function Voltar({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="btn-link self-start">
      ← {children}
    </Link>
  );
}
