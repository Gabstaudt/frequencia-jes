import Link from "next/link";
import { CopiarLink } from "@/components/admin-ui";
import { getConfig, todasPresencas } from "@/lib/dados";
import { formatarDataHora, statusDaFrequencia } from "@/lib/frequencia";
import { getOrigin } from "@/lib/site";
import { createAdminClient } from "@/lib/supabase/server";
import type { Frequencia } from "@/lib/types";
import { BadgeStatus, BotaoStatus } from "./status";

export const metadata = { title: "Frequências · Admin JES" };

export default async function FrequenciasPage() {
  const db = createAdminClient();
  const [{ data: freqs }, pres, config, origin] = await Promise.all([
    db.from("frequencias").select("*").order("dia").order("marcacao").order("desbloqueio_em"),
    todasPresencas(),
    getConfig(),
    getOrigin(),
  ]);
  const contagem = new Map<string, number>();
  for (const p of pres) contagem.set(p.frequencia_id, (contagem.get(p.frequencia_id) ?? 0) + 1);
  const lista = (freqs ?? []) as Frequencia[];

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="h1">Frequências</h1>
          <p className="text-muted">
            Cada dia completo vale {config.horas_por_dia}h · toque numa frequência para ver detalhes e quem marcou
          </p>
        </div>
        <Link href="/admin/frequencias/nova" className="btn-primary">
          + Nova frequência
        </Link>
      </div>

      {lista.length === 0 ? (
        <div className="card p-8 text-center text-body">
          Nenhuma frequência ainda. Crie a primeira com o botão <strong>Nova frequência</strong>.
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="rtable md:min-w-[760px]">
            <thead>
              <tr>
                <th>Frequência</th>
                <th>Palavra-chave</th>
                <th>Desbloqueio</th>
                <th>Presenças</th>
                <th>Status</th>
                <th>Link</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((f) => {
                const st = statusDaFrequencia(f);
                return (
                  <tr key={f.id}>
                    <td className="rt-full">
                      <Link href={`/admin/frequencias/${f.id}`} className="inline-flex min-h-11 items-center text-[15px] font-bold text-primary underline underline-offset-4">
                        {f.nome}
                      </Link>
                    </td>
                    <td data-label="Palavra-chave" className="font-mono">{f.palavra_chave}</td>
                    <td data-label="Desbloqueio">{formatarDataHora(f.desbloqueio_em)}</td>
                    <td data-label="Presenças">{contagem.get(f.id) ?? 0}</td>
                    <td data-label="Status">
                      <div className="flex items-center gap-2.5">
                        <BadgeStatus status={st} />
                        <BotaoStatus id={f.id} status={st} />
                      </div>
                    </td>
                    <td data-label="Link">
                      <CopiarLink url={`${origin}/f/${f.id}`} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-muted">A frequência libera sozinha no horário de desbloqueio. Fechar e reabrir é manual, a qualquer momento.</p>
    </>
  );
}
