"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Icone } from "@/components/ui";
import { formatarHora } from "@/lib/frequencia";
import { marcarPresenca, type MarcarState } from "./actions";

function Botao() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary h-14 text-[17px]" disabled={pending}>
      {pending ? "Registrando…" : "Confirmar presença"}
    </button>
  );
}

export function MarcarForm({ frequenciaId, nome, horasPorDia }: { frequenciaId: string; nome: string; horasPorDia: number }) {
  const [estado, acao] = useActionState<MarcarState, FormData>(marcarPresenca, {});

  if (estado.ok) {
    const completo = estado.diaTotal && estado.diaFeitas === estado.diaTotal;
    return (
      <div className="flex flex-col gap-5">
        <div className="flex flex-col items-center gap-3 pt-4 text-center">
          <span className="flex h-24 w-24 items-center justify-center rounded-full bg-ok-soft text-[#1e7a46]">
            <Icone nome="check" className="h-12 w-12" />
          </span>
          <h1 className="h1">Presença registrada</h1>
          <p className="text-body">
            {nome}
            {estado.hora && (
              <>
                <br />
                às {formatarHora(estado.hora)}
              </>
            )}
          </p>
        </div>
        <div className="card flex flex-col gap-2 p-4">
          <span className="font-semibold">Seu dia {estado.dia}</span>
          <span className={completo ? "font-semibold text-ok" : "text-body"}>
            {completo
              ? `Dia completo: ${horasPorDia}h contabilizadas.`
              : `${estado.diaFeitas} de ${estado.diaTotal} marcações feitas. Faça todas para o dia contar.`}
          </span>
        </div>
        <Link href="/inicio" className="btn-primary h-13 text-base">
          Ver minhas frequências
        </Link>
      </div>
    );
  }

  return (
    <form action={acao} className="flex flex-col gap-4">
      <input type="hidden" name="frequencia_id" value={frequenciaId} />
      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        Palavra-chave
        <input
          name="palavra"
          autoFocus
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="Digite a palavra anunciada"
          aria-invalid={!!estado.erro}
          className={`h-14 w-full rounded-xl border-2 bg-white px-4 text-lg font-semibold tracking-wide outline-none focus:ring-2 focus:ring-primary/20 ${
            estado.erro ? "border-bad-strong" : "border-field focus:border-primary"
          }`}
        />
      </label>
      {estado.erro && (
        <p role="alert" className="flex items-center gap-2 text-sm font-semibold text-bad-strong">
          <Icone nome="alerta" className="h-[18px] w-[18px]" />
          {estado.erro}
        </p>
      )}
      <Botao />
    </form>
  );
}
