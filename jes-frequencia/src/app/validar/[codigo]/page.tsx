import Link from "next/link";
import { AuthShell, Icone } from "@/components/ui";
import { formatarHoras } from "@/lib/certificados";
import { normalizarCodigo } from "@/lib/codigo";
import { getConfig } from "@/lib/dados";
import { formatarData } from "@/lib/frequencia";
import { createAdminClient } from "@/lib/supabase/server";
import type { Certificado } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Validação de certificado · JES", robots: { index: false } };

export default async function ResultadoValidacao({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo: bruto } = await params;
  const codigo = normalizarCodigo(decodeURIComponent(bruto));
  const db = createAdminClient();
  const [{ data: c }, config] = await Promise.all([
    db.from("certificados").select("*").eq("codigo", codigo).maybeSingle<Certificado>(),
    getConfig(),
  ]);
  const valido = !!c && !c.invalidado;

  return (
    <AuthShell>
      <h1 className="h1">Validação de certificado</h1>
      <p className="font-mono text-sm text-muted">Código: {codigo}</p>

      {valido && c ? (
        <section className="flex flex-col gap-4 rounded-2xl border-2 border-[#1e7a46] bg-white p-5">
          <div className="flex items-center gap-2.5 text-ok">
            <Icone nome="check" className="h-7 w-7" />
            <span className="text-lg font-bold">Certificado válido</span>
          </div>
          <dl className="grid grid-cols-2 gap-3.5">
            <Campo label="Nome" valor={c.nome} largo />
            <Campo label="Tipo" valor={c.tipo} />
            <Campo label="Carga horária" valor={`${formatarHoras(Number(c.horas))}h`} />
            <Campo label="Evento" valor={config.evento_nome} />
            <Campo label="Emitido em" valor={formatarData(c.emitido_em)} />
          </dl>
        </section>
      ) : (
        <section role="alert" className="flex flex-col gap-2 rounded-2xl border-2 border-bad-strong bg-white p-5">
          <div className="flex items-center gap-2.5 text-bad">
            <Icone nome="x" className="h-7 w-7" />
            <span className="text-lg font-bold">Certificado inválido</span>
          </div>
          <span className="leading-relaxed text-body">
            {c ? "Este certificado foi invalidado pela organização." : "Não existe certificado com este código. Confira se digitou certo."}
          </span>
        </section>
      )}

      <Link href="/validar" className="btn-secondary">
        Verificar outro código
      </Link>
    </AuthShell>
  );
}

function Campo({ label, valor, largo }: { label: string; valor: string; largo?: boolean }) {
  return (
    <div className={`flex flex-col gap-0.5 ${largo ? "col-span-2" : ""}`}>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="font-semibold">{valor}</dd>
    </div>
  );
}
