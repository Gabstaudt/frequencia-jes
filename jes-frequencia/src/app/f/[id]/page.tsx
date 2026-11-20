import Link from "next/link";
import { notFound } from "next/navigation";
import { Icone, Logo } from "@/components/ui";
import { getSessao } from "@/lib/auth";
import { COLUNAS_PUBLICAS, getConfig } from "@/lib/dados";
import { formatarDataHora, formatarHora, statusDaFrequencia } from "@/lib/frequencia";
import { createAdminClient } from "@/lib/supabase/server";
import type { FrequenciaPublica } from "@/lib/types";
import { MarcarForm } from "./marcar-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Frequência · JES" };

const UUID = /^[0-9a-f-]{36}$/i;

export default async function FrequenciaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const db = createAdminClient();
  const { data: f } = await db.from("frequencias").select(COLUNAS_PUBLICAS).eq("id", id).maybeSingle<FrequenciaPublica>();
  if (!f) notFound();

  const { user, profile } = await getSessao();
  const status = statusDaFrequencia(f);
  const caminho = `/f/${f.id}`;

  let marcadaEm: string | null = null;
  if (user) {
    const { data } = await db.from("presencas").select("created_at").eq("frequencia_id", f.id).eq("user_id", user.id).maybeSingle();
    marcadaEm = data?.created_at ?? null;
  }
  const config = await getConfig();

  const badge = marcadaEm
    ? { cls: "badge-ok", txt: "Presença registrada" }
    : status === "aberta"
      ? { cls: "badge-ok", txt: "Aberta agora" }
      : status === "programada"
        ? { cls: "badge-neutral", txt: "Ainda não liberada" }
        : { cls: "badge-bad", txt: "Encerrada" };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 pb-10 pt-6">
      <header className="mb-6 flex items-center justify-between gap-3">
        <Logo />
        {profile && (
          <Link href="/inicio" className="rounded-full border border-line bg-white px-3 py-1.5 text-[13px] text-body">
            {profile.nome.split(" ")[0]}
          </Link>
        )}
      </header>

      <main className="flex flex-col gap-5">
        <section className="card flex flex-col gap-4 p-5">
          <span className="eyebrow">Frequência · {config.evento_nome}</span>
          <h1 className="font-display text-[26px] font-bold leading-tight">{f.nome}</h1>
          <span className={`${badge.cls} self-start`}>{badge.txt}</span>

          {!user && (
            <p className="leading-relaxed text-body">
              Para registrar sua presença, entre na sua conta. Depois do login você volta direto para esta frequência.
            </p>
          )}

          {user && marcadaEm && (
            <Aviso cor="ok" icone="check">
              Você já marcou presença nesta frequência às <strong>{formatarHora(marcadaEm)}</strong>.
            </Aviso>
          )}
          {user && !marcadaEm && status === "programada" && (
            <Aviso cor="neutro" icone="cadeado">
              Ainda não liberada. Abre em <strong>{formatarDataHora(f.desbloqueio_em)}</strong>. Volte por este mesmo link nesse horário.
            </Aviso>
          )}
          {user && !marcadaEm && status === "fechada" && (
            <Aviso cor="bad" icone="menos">
              A organização encerrou esta frequência. Se você estava presente, procure a organização para registro manual.
            </Aviso>
          )}
          {user && !marcadaEm && status === "aberta" && (
            <MarcarForm frequenciaId={f.id} nome={f.nome} horasPorDia={Number(config.horas_por_dia)} />
          )}
        </section>

        {!user && (
          <>
            <Link href={`/entrar?next=${encodeURIComponent(caminho)}`} className="btn-primary h-13 text-base">
              Entrar para marcar presença
            </Link>
            <Link href={`/cadastro?next=${encodeURIComponent(caminho)}`} className="btn-secondary h-13 text-base">
              Criar conta
            </Link>
          </>
        )}

        {user && profile && !marcadaEm && status === "aberta" && (
          <section className="card flex flex-col gap-1.5 px-4 py-3.5">
            <span className="text-sm font-semibold">Será registrado junto com a presença</span>
            <span className="text-[13px] leading-relaxed text-body">
              {profile.nome} · {profile.email}
              {profile.universidade ? ` · ${profile.universidade}` : ""}
              {profile.estado ? ` · ${profile.estado}` : ""} · data e hora da marcação
            </span>
          </section>
        )}

        {user && (
          <Link href="/inicio" className="btn-link self-center">
            Ver todas as frequências
          </Link>
        )}
      </main>
    </div>
  );
}

function Aviso({ cor, icone, children }: { cor: "ok" | "neutro" | "bad"; icone: "check" | "cadeado" | "menos"; children: React.ReactNode }) {
  const cls = cor === "ok" ? "bg-ok-soft text-ok" : cor === "bad" ? "bg-bad-soft text-[#7a1a12]" : "bg-ground text-body";
  return (
    <div className={`flex items-start gap-3 rounded-xl p-3.5 leading-relaxed ${cls}`}>
      <Icone nome={icone} className="mt-0.5 h-6 w-6 shrink-0" />
      <span>{children}</span>
    </div>
  );
}
