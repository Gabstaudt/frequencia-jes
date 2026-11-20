import QRCode from "qrcode";
import { Icone } from "@/components/ui";
import { exigirUsuario } from "@/lib/auth";
import { getConfig } from "@/lib/dados";
import { formatarData } from "@/lib/frequencia";
import { getOrigin } from "@/lib/site";
import { createAdminClient } from "@/lib/supabase/server";
import type { Certificado } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Meus certificados · JES" };

export default async function CertificadosPage() {
  const { user } = await exigirUsuario("/certificados");
  const config = await getConfig();
  const origin = await getOrigin();

  let certs: Certificado[] = [];
  if (config.certificados_liberados) {
    const db = createAdminClient();
    const email = (user.email ?? "").toLowerCase();
    const { data } = await db
      .from("certificados")
      .select("*")
      .or(`user_id.eq.${user.id},email.eq.${email}`)
      .order("emitido_em", { ascending: false });
    certs = (data ?? []) as Certificado[];
  }

  const qrs = await Promise.all(
    certs.map((c) => QRCode.toString(`${origin}/validar/${c.codigo}`, { type: "svg", margin: 1, width: 72 })),
  );

  return (
    <>
      <h1 className="h1">Certificados</h1>

      {certs.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-field bg-white p-6 text-center">
          <Icone nome="relogio" className="h-8 w-8 text-muted" />
          <span className="font-semibold">{config.certificados_liberados ? "Nenhum certificado para você" : "Ainda não liberado"}</span>
          <span className="text-sm leading-relaxed text-muted">
            {config.certificados_liberados
              ? "Sua presença não atingiu a regra de carga horária do evento. Em caso de dúvida, procure a organização."
              : "Seu certificado aparece aqui quando a organização liberar a emissão."}
          </span>
        </div>
      )}

      {certs.map((c, i) => (
        <article key={c.id} className="card flex flex-col gap-3.5 p-5">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[17px] font-semibold">
              {c.tipo} · {config.evento_nome}
            </span>
            {c.invalidado ? <span className="badge-bad">Invalidado</span> : <span className="badge-ok">Disponível</span>}
          </div>
          <dl className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs text-muted">Carga horária</dt>
              <dd className="font-semibold">{Number(c.horas)}h</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-xs text-muted">Emitido em</dt>
              <dd className="font-semibold">{formatarData(c.emitido_em)}</dd>
            </div>
            <div className="col-span-2 flex flex-col gap-0.5">
              <dt className="text-xs text-muted">Código de validação</dt>
              <dd className="font-mono font-semibold">{c.codigo}</dd>
            </div>
          </dl>
          <div className="flex items-center gap-3 rounded-xl bg-ground p-3">
            <div className="h-[72px] w-[72px] shrink-0 bg-white" role="img" aria-label="QR code de validação" dangerouslySetInnerHTML={{ __html: qrs[i] }} />
            <span className="text-[13px] leading-relaxed text-body">
              O código e o QR code estão impressos no PDF. Qualquer pessoa confere em <strong>{origin.replace(/^https?:\/\//, "")}/validar</strong>.
            </span>
          </div>
          {!c.invalidado && (
            <a href={`/api/certificados/${c.codigo}/pdf`} className="btn-primary h-12">
              Baixar PDF
            </a>
          )}
        </article>
      ))}
    </>
  );
}
