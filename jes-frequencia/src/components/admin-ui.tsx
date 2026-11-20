"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

export function BotaoEnviar({ children, className = "btn-primary", pendente = "Aguarde…" }: { children: React.ReactNode; className?: string; pendente?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? pendente : children}
    </button>
  );
}

export function CopiarLink({ url, className = "btn-soft min-h-10 px-3 text-sm" }: { url: string; className?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
        } catch {
          window.prompt("Copie o link:", url);
        }
        setOk(true);
        setTimeout(() => setOk(false), 2000);
      }}
    >
      {ok ? "Link copiado" : "Copiar link"}
    </button>
  );
}

/** Botão de formulário que pede confirmação antes de enviar. */
export function BotaoConfirmar({ children, mensagem, className = "btn-danger" }: { children: React.ReactNode; mensagem: string; className?: string }) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!window.confirm(mensagem)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}

export function Mensagem({ erro, ok }: { erro?: string; ok?: string }) {
  if (erro) return <p role="alert" className="alert-error">{erro}</p>;
  if (ok) return <p role="status" className="alert-ok">{ok}</p>;
  return null;
}
