"use client";

import { useActionState, useState } from "react";
import { BotaoEnviar, Mensagem } from "@/components/admin-ui";
import { atualizarFrequencia, criarFrequencia, type AdminState } from "../actions";

type Valores = { id?: string; nome: string; dia: number; marcacao: number; palavra_chave: string; data: string; hora: string };

export function FrequenciaForm({ inicial, modo }: { inicial: Valores; modo: "criar" | "editar" }) {
  const [estado, acao] = useActionState<AdminState, FormData>(modo === "criar" ? criarFrequencia : atualizarFrequencia, {});
  const [nome, setNome] = useState(inicial.nome);
  const [dia, setDia] = useState(String(inicial.dia));
  const [marc, setMarc] = useState(String(inicial.marcacao));
  const [nomeTocado, setNomeTocado] = useState(modo === "editar");

  const nomeSugerido = `Dia ${dia} · Marcação ${marc}`;
  const nomeFinal = nomeTocado ? nome : nomeSugerido;

  return (
    <form action={acao} className="flex flex-col gap-4">
      {inicial.id && <input type="hidden" name="id" value={inicial.id} />}
      <div className="grid grid-cols-2 gap-4">
        <label className="label">
          Dia do evento
          <input className="input" type="number" min={1} name="dia" value={dia} onChange={(e) => setDia(e.target.value)} required />
        </label>
        <label className="label">
          Marcação
          <input className="input" type="number" min={1} name="marcacao" value={marc} onChange={(e) => setMarc(e.target.value)} required />
        </label>
      </div>
      <label className="label">
        Nome
        <input
          className="input"
          name="nome"
          value={nomeFinal}
          onChange={(e) => {
            setNomeTocado(true);
            setNome(e.target.value);
          }}
          required
        />
      </label>
      <label className="label">
        Palavra-chave
        <input className="input font-mono tracking-wide" name="palavra_chave" defaultValue={inicial.palavra_chave} required placeholder="Ex.: AMAZONIA" autoComplete="off" />
        <span className="text-[13px] font-normal text-muted">Maiúsculas, minúsculas e acentos não fazem diferença na hora de marcar.</span>
      </label>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="label">
          Data de desbloqueio
          <input className="input" type="date" name="data" defaultValue={inicial.data} required />
        </label>
        <label className="label">
          Hora de desbloqueio
          <input className="input" type="time" name="hora" defaultValue={inicial.hora} required />
        </label>
      </div>
      <p className="text-[13px] text-muted">Horário de Belém (UTC−3). A frequência abre sozinha nesse horário; você pode fechar e reabrir quando quiser.</p>
      <Mensagem erro={estado.erro} ok={estado.ok} />
      <div className="flex flex-wrap justify-end gap-3">
        <BotaoEnviar>{modo === "criar" ? "Criar frequência" : "Salvar alterações"}</BotaoEnviar>
      </div>
    </form>
  );
}
