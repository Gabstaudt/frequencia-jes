import Link from "next/link";
import { BotaoEnviar } from "@/components/admin-ui";
import { getConfig, todasPresencas, todosPerfis } from "@/lib/dados";
import { createAdminClient } from "@/lib/supabase/server";
import type { Frequencia } from "@/lib/types";
import { marcarPresencaManual } from "../actions";

export const metadata = { title: "Presenças · Admin JES" };

export default async function PresencasPage({ searchParams }: { searchParams: Promise<{ dia?: string; filtro?: string }> }) {
  const sp = await searchParams;
  const db = createAdminClient();
  const [{ data: fs }, perfis, pres, config] = await Promise.all([
    db.from("frequencias").select("*").order("dia").order("marcacao"),
    todosPerfis(),
    todasPresencas(),
    getConfig(),
  ]);
  const freqs = (fs ?? []) as Frequencia[];
  const dias = [...new Set(freqs.map((f) => f.dia))].sort((a, b) => a - b);
  const dia = Number(sp.dia) || dias[0] || 1;
  const filtro = sp.filtro === "incompletos" || sp.filtro === "completos" ? sp.filtro : "todos";
  const doDia = freqs.filter((f) => f.dia === dia);

  const marc = new Map<string, Map<string, string>>();
  for (const p of pres) {
    if (!marc.has(p.user_id)) marc.set(p.user_id, new Map());
    marc.get(p.user_id)!.set(p.frequencia_id, p.origem);
  }

  const linhas = perfis
    .filter((p) => !p.is_admin)
    .map((p) => {
      const m = marc.get(p.id) ?? new Map<string, string>();
      const n = doDia.filter((f) => m.has(f.id)).length;
      return { p, m, n };
    });
  const completos = linhas.filter((l) => doDia.length > 0 && l.n === doDia.length).length;
  const incompletos = linhas.filter((l) => l.n > 0 && l.n < doDia.length).length;
  const visiveis = linhas.filter((l) =>
    filtro === "incompletos" ? l.n > 0 && l.n < doDia.length : filtro === "completos" ? doDia.length > 0 && l.n === doDia.length : true,
  );

  const url = (d: number, f: string) => `/admin/presencas?dia=${d}&filtro=${f}`;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="h1">Presenças</h1>
          <p className="text-muted">
            Dia {dia}: {completos} completos ({config.horas_por_dia}h), {incompletos} incompletos (perdem o dia)
          </p>
        </div>
        <a href="/api/admin/export?tipo=presencas" className="btn-secondary">
          Exportar planilha (CSV)
        </a>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {dias.map((d) => (
          <Link
            key={d}
            href={url(d, filtro)}
            className={`inline-flex h-10 items-center rounded-full px-4 font-semibold ${
              d === dia ? "border-2 border-primary bg-primary-soft text-primary-ink" : "border border-field bg-white text-body"
            }`}
          >
            Dia {d}
          </Link>
        ))}
        <span className="mx-1 hidden h-6 w-px bg-line sm:block" />
        {(["todos", "incompletos", "completos"] as const).map((f) => (
          <Link
            key={f}
            href={url(dia, f)}
            className={`inline-flex h-10 items-center rounded-full px-4 text-sm font-semibold ${
              f === filtro ? "bg-ink text-white" : "border border-field bg-white text-body"
            }`}
          >
            {f === "todos" ? "Todos" : f === "incompletos" ? "Só incompletos (1 de 2)" : "Só completos"}
          </Link>
        ))}
      </div>

      {doDia.length === 0 ? (
        <div className="card p-8 text-center text-body">Nenhuma frequência neste dia.</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="rtable md:min-w-[760px]">
            <thead>
              <tr>
                <th>Participante</th>
                {doDia.map((f) => (
                  <th key={f.id}>Marcação {f.marcacao}</th>
                ))}
                <th>Situação do dia</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {visiveis.map(({ p, m, n }) => {
                const falta = doDia.find((f) => !m.has(f.id));
                return (
                  <tr key={p.id}>
                    <td className="rt-full">
                      <div className="flex flex-col">
                        <span className="font-semibold">{p.nome}</span>
                        <span className="text-xs text-muted">{p.email}</span>
                      </div>
                    </td>
                    {doDia.map((f) => {
                      const o = m.get(f.id);
                      return (
                        <td key={f.id} data-label={`Marcação ${f.marcacao}`} className={`font-semibold ${o === "manual" ? "text-primary-ink" : o ? "text-ok" : "text-bad"}`}>
                          {o === "manual" ? "Manual" : o ? "Registrada" : "Faltou"}
                        </td>
                      );
                    })}
                    <td data-label="Situação">
                      {n === doDia.length ? (
                        <span className="badge-ok">Completo · {config.horas_por_dia}h</span>
                      ) : n > 0 ? (
                        <span className="badge-warn">Incompleto · perde o dia</span>
                      ) : (
                        <span className="badge-neutral">Ausente</span>
                      )}
                    </td>
                    <td data-label="">
                      {falta && n > 0 && (
                        <form action={marcarPresencaManual} className="flex justify-end md:justify-start">
                          <input type="hidden" name="frequencia_id" value={falta.id} />
                          <input type="hidden" name="user_id" value={p.id} />
                          <BotaoEnviar className="btn-secondary min-h-10 whitespace-nowrap px-3 text-sm" pendente="Marcando…">
                            Marcar M{falta.marcacao} manual
                          </BotaoEnviar>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {visiveis.length === 0 && <p className="p-5 text-muted">Ninguém nesta lista.</p>}
        </div>
      )}
      <p className="text-muted">
        Presença manual fica registrada como &quot;manual&quot;, com o nome do admin e o horário. Para marcar alguém ausente o dia todo, use a tela da frequência.
      </p>
    </>
  );
}
