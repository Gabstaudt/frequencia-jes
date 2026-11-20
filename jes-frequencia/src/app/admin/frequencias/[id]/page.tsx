import { notFound } from "next/navigation";
import { BotaoConfirmar, CopiarLink } from "@/components/admin-ui";
import { Voltar } from "@/components/ui";
import { formatarHora, isoParaLocal, statusDaFrequencia } from "@/lib/frequencia";
import { getOrigin } from "@/lib/site";
import { createAdminClient } from "@/lib/supabase/server";
import type { Frequencia } from "@/lib/types";
import { todasPresencas, todosPerfis } from "@/lib/dados";
import { excluirFrequencia } from "../../actions";
import { FrequenciaForm } from "../form";
import { BadgeStatus, BotaoStatus } from "../status";
import { Listas, type LinhaAusente, type LinhaPresente } from "./listas";

export const metadata = { title: "Frequência · Admin JES" };

export default async function DetalheFrequenciaPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ criada?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const db = createAdminClient();
  const { data: f } = await db.from("frequencias").select("*").eq("id", id).maybeSingle<Frequencia>();
  if (!f) notFound();

  const [pres, perfis, origin] = await Promise.all([todasPresencas(id), todosPerfis(), getOrigin()]);
  const perfisMap = new Map(perfis.map((p) => [p.id, p]));
  const marcou = new Set(pres.map((p) => p.user_id));

  const presentes: LinhaPresente[] = pres.map((p) => {
    const pr = perfisMap.get(p.user_id);
    return {
      user_id: p.user_id,
      nome: pr?.nome ?? "(conta removida)",
      email: pr?.email ?? "",
      universidade: pr?.universidade || (pr?.estuda ? "—" : "Não estuda"),
      estado: pr?.estado ?? "—",
      hora: formatarHora(p.created_at),
      manual: p.origem === "manual",
      marcadoPor: p.marcado_por ? (perfisMap.get(p.marcado_por)?.nome.split(" ")[0] ?? null) : null,
    };
  });
  const ausentes: LinhaAusente[] = perfis
    .filter((p) => !marcou.has(p.id) && !p.is_admin)
    .map((p) => ({ user_id: p.id, nome: p.nome, email: p.email }));

  const st = statusDaFrequencia(f);
  const link = `${origin}/f/${f.id}`;
  const local = isoParaLocal(f.desbloqueio_em);
  const manuais = presentes.filter((p) => p.manual).length;

  return (
    <>
      <Voltar href="/admin/frequencias">Frequências</Voltar>
      {sp.criada && <p className="alert-ok">Frequência criada. Copie o link abaixo para compartilhar.</p>}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="h1">{f.nome}</h1>
          <BadgeStatus status={st} />
        </div>
        <div className="flex flex-wrap gap-2.5">
          <CopiarLink url={link} className="btn-soft" />
          <BotaoStatus id={f.id} status={st} className="btn-dark" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Presenças" valor={presentes.length} />
        <Kpi label="Ainda não marcaram" valor={ausentes.length} />
        <Kpi label="Marcadas manualmente" valor={manuais} />
        <div className="card col-span-2 flex flex-col gap-1 p-4 lg:col-span-1">
          <span className="text-muted">Link</span>
          <span className="break-all font-mono text-[13px]">{link}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-start gap-5">
        <section className="card flex min-w-0 flex-[1_1_300px] flex-col gap-4 p-5">
          <h2 className="text-[17px] font-semibold">Informações</h2>
          <FrequenciaForm
            modo="editar"
            inicial={{ id: f.id, nome: f.nome, dia: f.dia, marcacao: f.marcacao, palavra_chave: f.palavra_chave, data: local.slice(0, 10), hora: local.slice(11, 16) }}
          />
          <form action={excluirFrequencia} className="border-t border-line pt-4">
            <input type="hidden" name="id" value={f.id} />
            <BotaoConfirmar mensagem="Excluir esta frequência e todas as presenças dela? Isso não pode ser desfeito." className="btn-danger w-full">
              Excluir frequência
            </BotaoConfirmar>
          </form>
        </section>
        <Listas frequenciaId={f.id} presentes={presentes} ausentes={ausentes} />
      </div>
    </>
  );
}

function Kpi({ label, valor }: { label: string; valor: number }) {
  return (
    <div className="card flex flex-col gap-1 p-4">
      <span className="text-muted">{label}</span>
      <span className="font-display text-[26px] font-bold">{valor}</span>
    </div>
  );
}
