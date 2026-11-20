import Link from "next/link";
import { exigirUsuario } from "@/lib/auth";
import { agruparPorDia, getConfig, listarFrequenciasPublicas, presencasDoUsuario } from "@/lib/dados";
import { formatarDataHora, formatarHora, statusDaFrequencia } from "@/lib/frequencia";

export const dynamic = "force-dynamic";
export const metadata = { title: "Minhas frequências · JES" };

export default async function InicioPage({ searchParams }: { searchParams: Promise<{ senha?: string }> }) {
  const sp = await searchParams;
  const { user, profile } = await exigirUsuario("/inicio");
  const [freqs, pres, config] = await Promise.all([listarFrequenciasPublicas(), presencasDoUsuario(user.id), getConfig()]);
  const marcadas = new Map(pres.map((p) => [p.frequencia_id, p.created_at as string]));
  const dias = agruparPorDia(freqs);

  return (
    <>
      <div className="flex flex-col gap-0.5">
        <span className="text-sm text-muted">Olá,</span>
        <h1 className="h1">{profile.nome.split(" ")[0]}</h1>
      </div>
      {sp.senha === "ok" && <p className="alert-ok">Senha alterada.</p>}

      {dias.length === 0 && (
        <div className="card p-6 text-center text-body">Nenhuma frequência cadastrada ainda. Quando a organização liberar, ela aparece aqui.</div>
      )}

      {dias.map(([dia, lista]) => {
        const feitas = lista.filter((f) => marcadas.has(f.id)).length;
        const resumo = feitas === lista.length ? `completo · ${config.horas_por_dia}h` : `${feitas} de ${lista.length} marcações`;
        return (
          <section key={dia} className="flex flex-col gap-2.5">
            <h2 className="eyebrow">
              Dia {dia} · {resumo}
            </h2>
            {lista.map((f) => {
              const hora = marcadas.get(f.id);
              const st = statusDaFrequencia(f);
              const [badge, cls, sub] = hora
                ? ["Registrada", "badge-ok", `Às ${formatarHora(hora)}`]
                : st === "aberta"
                  ? ["Aberta", "badge-info", "Toque para marcar presença"]
                  : st === "programada"
                    ? ["Bloqueada", "badge-neutral", `Abre em ${formatarDataHora(f.desbloqueio_em)}`]
                    : ["Encerrada", "badge-bad", "Encerrada pela organização"];
              return (
                <Link key={f.id} href={`/f/${f.id}`} className="card flex items-center justify-between gap-3 p-4 hover:border-field">
                  <span className="flex flex-col gap-1">
                    <span className="font-semibold">{f.nome}</span>
                    <span className="text-[13px] text-muted">{sub}</span>
                  </span>
                  <span className={cls}>{badge}</span>
                </Link>
              );
            })}
          </section>
        );
      })}
      {dias.length > 0 && (
        <p className="text-[13px] leading-relaxed text-muted">
          Cada dia vale {config.horas_por_dia}h e só conta com todas as marcações do dia.
        </p>
      )}
    </>
  );
}
