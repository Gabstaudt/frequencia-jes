import { getConfig, todasPresencas, todosPerfis } from "@/lib/dados";
import { diasCompletosPorUsuario } from "@/lib/horas";
import { createAdminClient } from "@/lib/supabase/server";

export const metadata = { title: "Métricas · Admin JES" };

function idade(nasc: string | null) {
  if (!nasc) return null;
  const d = new Date(nasc);
  const hoje = new Date();
  let i = hoje.getFullYear() - d.getFullYear();
  const m = hoje.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && hoje.getDate() < d.getDate())) i--;
  return i;
}

function faixa(i: number | null) {
  if (i === null) return "Não informado";
  if (i <= 17) return "Até 17 anos";
  if (i <= 20) return "18 a 20 anos";
  if (i <= 25) return "21 a 25 anos";
  if (i <= 30) return "26 a 30 anos";
  if (i <= 40) return "31 a 40 anos";
  return "41 anos ou mais";
}

function contar<T>(lista: T[], chave: (x: T) => string) {
  const m = new Map<string, number>();
  for (const x of lista) m.set(chave(x), (m.get(chave(x)) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

export default async function MetricasPage() {
  const db = createAdminClient();
  const [perfisTodos, pres, { data: fs }, config] = await Promise.all([
    todosPerfis(),
    todasPresencas(),
    db.from("frequencias").select("id,dia,nome,marcacao").order("dia").order("marcacao"),
    getConfig(),
  ]);
  const perfis = perfisTodos.filter((p) => !p.is_admin);
  const freqs = fs ?? [];
  const ids = new Set(perfis.map((p) => p.id));
  const presPart = pres.filter((p) => ids.has(p.user_id));
  const { resultado, totalDias } = diasCompletosPorUsuario(freqs, presPart);
  const comPresenca = new Set(presPart.map((p) => p.user_id)).size;
  const todosDias = [...resultado.values()].filter((d) => totalDias > 0 && d === totalDias).length;
  const univ = perfis.filter((p) => p.estuda).length;
  const pct = (n: number) => (perfis.length ? Math.round((n / perfis.length) * 100) : 0);

  const porFreq = new Map<string, number>();
  for (const p of presPart) porFreq.set(p.frequencia_id, (porFreq.get(p.frequencia_id) ?? 0) + 1);

  const blocos = [
    { titulo: "Faixa etária", itens: contar(perfis, (p) => faixa(idade(p.data_nascimento))) },
    { titulo: "Universidade", itens: contar(perfis, (p) => (p.estuda ? p.universidade || "Não informada" : "Não estuda")) },
    { titulo: "Estado de residência", itens: contar(perfis, (p) => p.estado || "Não informado") },
    { titulo: "Presenças por frequência", itens: freqs.map((f) => [f.nome, porFreq.get(f.id) ?? 0] as [string, number]) },
  ];

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="h1">Métricas</h1>
          <p className="text-muted">Calculadas a partir do cadastro e das presenças · {config.evento_nome}</p>
        </div>
        <a href="/api/admin/export?tipo=participantes" className="btn-secondary">
          Exportar participantes (CSV)
        </a>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Inscritos" valor={String(perfis.length)} />
        <Kpi label="Marcaram ao menos 1 vez" valor={String(comPresenca)} />
        <Kpi label={`Presentes em todos os ${totalDias} dias`} valor={String(todosDias)} />
        <Kpi label="Universitários" valor={`${pct(univ)}%`} />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {blocos.map((b) => {
          const max = Math.max(1, ...b.itens.map((i) => i[1]));
          return (
            <section key={b.titulo} className="card flex flex-col gap-3 p-5">
              <h2 className="font-semibold">{b.titulo}</h2>
              {b.itens.length === 0 && <p className="text-muted">Sem dados ainda.</p>}
              {b.itens.map(([label, n]) => (
                <div key={label} className="flex flex-col gap-1">
                  <div className="flex justify-between gap-3 text-sm">
                    <span>{label}</span>
                    <span className="font-semibold">{n}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded bg-[#eef0f3]">
                    <div className="h-2 rounded bg-primary" style={{ width: `${(n / max) * 100}%` }} />
                  </div>
                </div>
              ))}
            </section>
          );
        })}
      </div>
    </>
  );
}

function Kpi({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="card flex flex-col gap-1.5 p-4">
      <span className="text-sm font-medium text-muted">{label}</span>
      <span className="font-display text-[28px] font-bold">{valor}</span>
    </div>
  );
}
