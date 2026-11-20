"use client";

import { useActionState, useState } from "react";
import { BotaoEnviar, Mensagem } from "@/components/admin-ui";
import { Icone } from "@/components/ui";
import type { Regra } from "@/lib/types";
import { adicionarPessoa, criarTipo, emitir, enviarArte, salvarRegra, type CertState } from "./actions";

export function UploadArteForm({ tipo, temArte }: { tipo: string; temArte: boolean }) {
  const [estado, acao] = useActionState<CertState, FormData>(enviarArte, {});
  const [nome, setNome] = useState("");
  return (
    <form action={acao} className="flex flex-col gap-3">
      <input type="hidden" name="tipo" value={tipo} />
      <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-field bg-[#f8f9fb] px-4 py-5 text-center hover:border-primary">
        <Icone nome="upload" className="h-7 w-7 text-muted" />
        <span className="font-semibold">{nome || (temArte ? "Trocar a arte do certificado" : "Escolher a arte do certificado")}</span>
        <span className="text-[13px] leading-relaxed text-muted">PNG ou JPG, até 4 MB. Exporte a arte do Canva, PowerPoint ou Word como imagem, sem os textos que mudam.</span>
        <input type="file" name="arquivo" accept="image/png,image/jpeg" className="sr-only" required onChange={(e) => setNome(e.target.files?.[0]?.name ?? "")} />
      </label>
      <Mensagem erro={estado.erro} ok={estado.ok} />
      {nome && <BotaoEnviar pendente="Enviando…">Enviar arte</BotaoEnviar>}
    </form>
  );
}

export function NovoTipoForm() {
  const [estado, acao] = useActionState<CertState, FormData>(criarTipo, {});
  return (
    <form action={acao} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-end gap-2">
        <label className="label flex-[1_1_200px]">
          Novo tipo de certificado
          <input name="tipo" className="input h-11" placeholder="Ex.: Monitor" required />
        </label>
        <BotaoEnviar className="btn-secondary h-11">Criar tipo</BotaoEnviar>
      </div>
      <Mensagem erro={estado.erro} ok={estado.ok} />
    </form>
  );
}

export function RegraForm({ regra, percentual, horasPorDia, evento }: { regra: Regra; percentual: number; horasPorDia: number; evento: string }) {
  const [estado, acao] = useActionState<CertState, FormData>(salvarRegra, {});
  const [r, setR] = useState<Regra>(regra);
  const textos: Record<Regra, string> = {
    soma: "Cada dia completo soma as horas do dia. Quem tem ao menos 1 dia completo recebe.",
    percentual: "Acima do percentual de dias completos, recebe a carga horária cheia do evento. Abaixo, não recebe.",
    minimo: "Recebe a soma das horas só quem atinge o percentual mínimo de dias completos.",
  };
  return (
    <form action={acao} className="flex flex-col gap-4">
      <input type="hidden" name="regra" value={r} />
      <div className="flex flex-wrap gap-2">
        {(["soma", "percentual", "minimo"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setR(v)}
            aria-pressed={r === v}
            className={`h-10 rounded-[10px] px-3.5 font-semibold ${r === v ? "border-2 border-primary bg-primary-soft text-primary-ink" : "border border-field bg-white text-body"}`}
          >
            {v === "soma" ? "Soma" : v === "percentual" ? "Percentual" : "Mínimo"}
          </button>
        ))}
      </div>
      <p className="leading-relaxed text-body">{textos[r]}</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="label">
          Percentual (%)
          <input className="input h-11" type="number" name="regra_percentual" min={0} max={100} defaultValue={percentual} disabled={r === "soma"} />
        </label>
        <label className="label">
          Horas por dia completo
          <input className="input h-11" type="number" step="0.5" name="horas_por_dia" min={0.5} defaultValue={horasPorDia} required />
        </label>
        <label className="label">
          Nome do evento
          <input className="input h-11" name="evento_nome" defaultValue={evento} required />
        </label>
      </div>
      {r === "soma" && <input type="hidden" name="regra_percentual" value={percentual} />}
      <Mensagem erro={estado.erro} ok={estado.ok} />
      <BotaoEnviar className="btn-primary self-start">Salvar regra</BotaoEnviar>
    </form>
  );
}

export function PessoaForm({ tipos }: { tipos: string[] }) {
  const [estado, acao] = useActionState<CertState, FormData>(adicionarPessoa, {});
  const opcoes = tipos.filter((t) => t !== "Participante");
  return (
    <form action={acao} className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="label">
          Nome completo
          <input className="input h-11" name="nome" required />
        </label>
        <label className="label">
          E-mail
          <input className="input h-11" type="email" name="email" required />
        </label>
        <label className="label">
          Tipo
          <select className="input h-11" name="tipo" required defaultValue={opcoes[0]}>
            {opcoes.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
        <label className="label">
          Carga horária (h)
          <input className="input h-11" type="number" step="0.5" min={0.5} name="horas" required />
        </label>
      </div>
      <Mensagem erro={estado.erro} ok={estado.ok} />
      <BotaoEnviar className="btn-secondary self-start">+ Adicionar pessoa</BotaoEnviar>
    </form>
  );
}

export function EmitirForm({ total, jaEmitido }: { total: number; jaEmitido: boolean }) {
  const [estado, acao] = useActionState<CertState, FormData>(emitir, {});
  return (
    <form
      action={acao}
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        if (!window.confirm(`Emitir ${total} certificados e liberar nas contas?`)) e.preventDefault();
      }}
    >
      <Mensagem erro={estado.erro} ok={estado.ok} />
      <BotaoEnviar className="btn-primary h-12" pendente="Emitindo…">
        {jaEmitido ? "Emitir de novo (aplica regra e dados atuais)" : "Emitir e liberar certificados"}
      </BotaoEnviar>
    </form>
  );
}
