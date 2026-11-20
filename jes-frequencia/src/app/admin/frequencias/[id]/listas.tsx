"use client";

import { useMemo, useState } from "react";
import { BotaoConfirmar, BotaoEnviar } from "@/components/admin-ui";
import { marcarPresencaManual, removerPresenca } from "../../actions";

export type LinhaPresente = {
  user_id: string;
  nome: string;
  email: string;
  universidade: string;
  estado: string;
  hora: string;
  manual: boolean;
  marcadoPor: string | null;
};
export type LinhaAusente = { user_id: string; nome: string; email: string };

function filtrar<T extends { nome: string; email: string }>(lista: T[], q: string) {
  const t = q.trim().toLowerCase();
  if (!t) return lista;
  return lista.filter((x) => x.nome.toLowerCase().includes(t) || x.email.toLowerCase().includes(t));
}

export function Listas({ frequenciaId, presentes, ausentes }: { frequenciaId: string; presentes: LinhaPresente[]; ausentes: LinhaAusente[] }) {
  const [q, setQ] = useState("");
  const p = useMemo(() => filtrar(presentes, q), [presentes, q]);
  const a = useMemo(() => filtrar(ausentes, q), [ausentes, q]);

  return (
    <div className="flex min-w-0 flex-[999_1_360px] flex-col gap-4">
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Buscar participante por nome ou e-mail"
        aria-label="Buscar participante"
        className="input h-11"
      />
      <section className="card overflow-x-auto">
        <h2 className="px-4 pb-2 pt-4 text-[17px] font-semibold">Quem marcou ({presentes.length})</h2>
        {p.length === 0 ? (
          <p className="px-4 pb-4 text-muted">{presentes.length === 0 ? "Ninguém marcou ainda." : "Ninguém encontrado."}</p>
        ) : (
          <table className="rtable md:min-w-[640px]">
            <thead>
              <tr>
                <th>Participante</th>
                <th>Universidade</th>
                <th>Estado</th>
                <th>Horário</th>
                <th>Origem</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {p.map((x) => (
                <tr key={x.user_id}>
                  <td className="rt-full">
                    <div className="flex flex-col">
                      <span className="font-semibold">{x.nome}</span>
                      <span className="text-xs text-muted">{x.email}</span>
                    </div>
                  </td>
                  <td data-label="Universidade">{x.universidade}</td>
                  <td data-label="Estado">{x.estado}</td>
                  <td data-label="Horário">{x.hora}</td>
                  <td data-label="Origem">
                    {x.manual ? <span className="badge-info">Manual{x.marcadoPor ? ` · ${x.marcadoPor}` : ""}</span> : <span className="badge-ok">Palavra-chave</span>}
                  </td>
                  <td data-label="">
                    <form action={removerPresenca} className="flex justify-end">
                      <input type="hidden" name="frequencia_id" value={frequenciaId} />
                      <input type="hidden" name="user_id" value={x.user_id} />
                      <BotaoConfirmar mensagem={`Remover a presença de ${x.nome}?`} className="btn-danger min-h-9 px-3 text-xs">
                        Remover
                      </BotaoConfirmar>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="card flex flex-col gap-2.5 p-4">
        <h2 className="text-[17px] font-semibold">Ainda não marcaram ({ausentes.length})</h2>
        {a.length === 0 && <p className="text-muted">{ausentes.length === 0 ? "Todos os inscritos já marcaram." : "Ninguém encontrado."}</p>}
        {a.map((x) => (
          <div key={x.user_id} className="flex flex-wrap items-center justify-between gap-2.5 border-t border-[#eef0f3] pt-2.5">
            <span className="flex flex-col">
              <span className="font-semibold">{x.nome}</span>
              <span className="text-xs text-muted">{x.email}</span>
            </span>
            <form action={marcarPresencaManual}>
              <input type="hidden" name="frequencia_id" value={frequenciaId} />
              <input type="hidden" name="user_id" value={x.user_id} />
              <BotaoEnviar className="btn-secondary min-h-10 px-3 text-sm" pendente="Marcando…">
                Marcar presença manual
              </BotaoEnviar>
            </form>
          </div>
        ))}
      </section>
    </div>
  );
}
