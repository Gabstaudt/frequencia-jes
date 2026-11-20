"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { cadastrar, entrar, esqueciSenha, redefinirSenha, reenviarConfirmacao, type FormState } from "./actions";
import { ESTADOS } from "@/lib/frequencia";

const inicial: FormState = {};

export function Enviar({ children, className = "btn-primary h-13 text-base" }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending}>
      {pending ? "Aguarde…" : children}
    </button>
  );
}

function Mensagem({ estado }: { estado: FormState }) {
  if (estado.erro) return <p role="alert" className="alert-error">{estado.erro}</p>;
  if (estado.ok) return <p role="status" className="alert-ok">{estado.ok}</p>;
  return null;
}

export function LoginForm({ next }: { next: string }) {
  const [estado, acao] = useActionState(entrar, inicial);
  return (
    <form action={acao} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <label className="label">
        E-mail
        <input className="input" type="email" name="email" autoComplete="email" required placeholder="seu@email.com" />
      </label>
      <label className="label">
        Senha
        <input className="input" type="password" name="senha" autoComplete="current-password" required />
      </label>
      <Link href="/esqueci-senha" className="btn-link self-end text-sm">
        Esqueci minha senha
      </Link>
      <Mensagem estado={estado} />
      <Enviar>Entrar</Enviar>
    </form>
  );
}

const UNIVERSIDADES = ["UEPA", "UFPA", "UFRA", "IFPA", "UNAMA", "CESUPA", "Outra"];

export function CadastroForm({ next }: { next: string }) {
  const [estado, acao] = useActionState(cadastrar, inicial);
  const [estuda, setEstuda] = useState<"sim" | "nao">("sim");
  const [uni, setUni] = useState("");
  return (
    <form action={acao} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <input type="hidden" name="estuda" value={estuda} />
      <label className="label">
        Nome completo
        <input className="input" name="nome" autoComplete="name" required placeholder="Como deve sair no certificado" />
      </label>
      <label className="label">
        E-mail
        <input className="input" type="email" name="email" autoComplete="email" required placeholder="seu@email.com" />
      </label>
      <label className="label">
        Senha
        <input className="input" type="password" name="senha" autoComplete="new-password" minLength={8} required placeholder="Mínimo de 8 caracteres" />
      </label>
      <label className="label">
        Data de nascimento
        <input className="input" type="date" name="data_nascimento" required />
      </label>
      <fieldset className="flex flex-col gap-1.5">
        <legend className="mb-1.5 text-sm font-medium">Estuda em alguma universidade?</legend>
        <div className="flex gap-2">
          {(["sim", "nao"] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={estuda === v}
              onClick={() => setEstuda(v)}
              className={`h-11 flex-1 rounded-[10px] font-semibold ${
                estuda === v ? "border-2 border-primary bg-primary-soft text-primary-ink" : "border border-field bg-white text-body"
              }`}
            >
              {v === "sim" ? "Sim" : "Não"}
            </button>
          ))}
        </div>
      </fieldset>
      {estuda === "sim" && (
        <>
          <label className="label">
            Universidade
            <select className="input" name="universidade" value={uni} onChange={(e) => setUni(e.target.value)} required>
              <option value="">Selecione</option>
              {UNIVERSIDADES.map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
          </label>
          {uni === "Outra" && (
            <label className="label">
              Qual universidade?
              <input className="input" name="universidade_outra" required />
            </label>
          )}
        </>
      )}
      <label className="label">
        Estado de residência
        <select className="input" name="estado" required defaultValue="">
          <option value="">Selecione</option>
          {ESTADOS.map((uf) => (
            <option key={uf}>{uf}</option>
          ))}
        </select>
      </label>
      <label className="flex items-start gap-2.5 text-[13px] leading-relaxed text-body">
        <input type="checkbox" name="aceite" required className="mt-0.5 h-5 w-5 shrink-0 accent-primary" />
        <span>
          Li e aceito os termos de uso. Meus dados serão usados para emitir certificados e gerar métricas do JES, conforme a LGPD.
        </span>
      </label>
      <Mensagem estado={estado} />
      <Enviar>Criar conta</Enviar>
    </form>
  );
}

export function ReenviarForm({ email, next }: { email: string; next: string }) {
  const [estado, acao] = useActionState(reenviarConfirmacao, inicial);
  return (
    <form action={acao} className="flex flex-col gap-3">
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="next" value={next} />
      <Mensagem estado={estado} />
      <Enviar className="btn-secondary">Reenviar e-mail</Enviar>
    </form>
  );
}

export function EsqueciForm() {
  const [estado, acao] = useActionState(esqueciSenha, inicial);
  if (estado.ok) return <Mensagem estado={estado} />;
  return (
    <form action={acao} className="flex flex-col gap-4">
      <label className="label">
        E-mail
        <input className="input" type="email" name="email" autoComplete="email" required placeholder="seu@email.com" />
      </label>
      <Mensagem estado={estado} />
      <Enviar>Enviar link</Enviar>
    </form>
  );
}

export function RedefinirForm() {
  const [estado, acao] = useActionState(redefinirSenha, inicial);
  return (
    <form action={acao} className="flex flex-col gap-4">
      <label className="label">
        Nova senha
        <input className="input" type="password" name="senha" autoComplete="new-password" minLength={8} required />
      </label>
      <label className="label">
        Repita a nova senha
        <input className="input" type="password" name="confirmar" autoComplete="new-password" minLength={8} required />
      </label>
      <Mensagem estado={estado} />
      <Enviar>Salvar nova senha</Enviar>
    </form>
  );
}
