import Link from "next/link";
import { BotaoConfirmar, BotaoEnviar } from "@/components/admin-ui";
import { buscarTodos } from "@/lib/dados";
import { calcularDestinatarios, formatarHoras, listarModelos } from "@/lib/certificados";
import { CAMPOS, camposUsados } from "@/lib/campos";
import { formatarData, formatarDataHora } from "@/lib/frequencia";
import { descricaoRegra } from "@/lib/horas";
import { getOrigin } from "@/lib/site";
import { createAdminClient } from "@/lib/supabase/server";
import type { Certificado, PessoaExtra } from "@/lib/types";
import { alternarInvalidado, alternarLiberacao, excluirTipo, removerArte, removerPessoa } from "./actions";
import { EditorModelo } from "./editor";
import { EmitirForm, NovoTipoForm, PessoaForm, RegraForm, UploadArteForm } from "./forms";

export const metadata = { title: "Certificados · Admin JES" };

const DESC_CAMPOS: Record<string, string> = {
  nome: "Nome completo",
  horas: "Carga horária",
  evento: "Nome do evento",
  data_emissao: "Data de emissão",
  tipo: "Tipo do certificado",
  codigo: "Código de validação",
  link_validacao: "Endereço da página de validação",
};

export default async function CertificadosAdminPage({ searchParams }: { searchParams: Promise<{ etapa?: string; tipo?: string }> }) {
  const sp = await searchParams;
  const etapa = sp.etapa === "regra" || sp.etapa === "emitir" ? sp.etapa : "modelos";
  const db = createAdminClient();
  const [modelos, calc, origin] = await Promise.all([listarModelos(), calcularDestinatarios(), getOrigin()]);
  const { config, totalDias, participantes, destinatarios } = calc;
  const tipos = modelos.map((m) => m.tipo);

  const etapas = [
    { id: "modelos", label: "1. Modelos" },
    { id: "regra", label: "2. Regra e pessoas" },
    { id: "emitir", label: "3. Emitir" },
  ];

  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="h1">Certificados</h1>
        <p className="text-muted">Monte o modelo com os campos, defina a regra e emita. O sistema preenche cada certificado sozinho.</p>
      </div>
      <nav aria-label="Etapas" className="flex gap-2 overflow-x-auto pb-0.5">
        {etapas.map((e) => (
          <Link
            key={e.id}
            href={`/admin/certificados?etapa=${e.id}`}
            aria-current={etapa === e.id ? "page" : undefined}
            className={`inline-flex h-11 shrink-0 items-center rounded-full px-4 font-semibold ${etapa === e.id ? "bg-ink text-white" : "border border-field bg-white text-body"}`}
          >
            {e.label}
          </Link>
        ))}
      </nav>

      {etapa === "modelos" && <EtapaModelos tipoSel={sp.tipo} modelos={modelos} origin={origin} eventoNome={config.evento_nome} destinatarios={destinatarios} />}

      {etapa === "regra" && (
        <EtapaRegra
          config={config}
          totalDias={totalDias}
          participantes={participantes.map((p) => ({ nome: p.perfil.nome, dias: p.dias, horas: p.horas }))}
          tipos={tipos}
          extras={((await db.from("pessoas_extras").select("*").order("tipo").order("nome")).data ?? []) as PessoaExtra[]}
        />
      )}

      {etapa === "emitir" && (
        <EtapaEmitir
          modelosSemArte={modelos.filter((m) => !m.imagem_path && destinatarios.some((d) => d.tipo === m.tipo)).map((m) => m.tipo)}
          total={destinatarios.length}
          liberados={config.certificados_liberados}
          liberadosEm={config.liberados_em}
          regraTexto={descricaoRegra(config.regra, config.regra_percentual, Number(config.horas_por_dia))}
          certs={await buscarTodos<Certificado>((de, ate) => db.from("certificados").select("*").order("tipo").order("nome").range(de, ate))}
        />
      )}
    </>
  );
}

// ------------------------------------------------------------------

async function EtapaModelos({
  tipoSel,
  modelos,
  origin,
  eventoNome,
  destinatarios,
}: {
  tipoSel?: string;
  modelos: Awaited<ReturnType<typeof listarModelos>>;
  origin: string;
  eventoNome: string;
  destinatarios: Awaited<ReturnType<typeof calcularDestinatarios>>["destinatarios"];
}) {
  const m = modelos.find((x) => x.tipo === tipoSel) ?? modelos[0];
  if (!m) return <p className="card p-6">Nenhum tipo de certificado. Rode o arquivo schema.sql no Supabase.</p>;

  let imagemUrl: string | null = null;
  if (m.imagem_path) {
    const { data } = await createAdminClient().storage.from("modelos").createSignedUrl(m.imagem_path, 60 * 60);
    imagemUrl = data?.signedUrl ?? null;
  }
  const exemplo = destinatarios.find((d) => d.tipo === m.tipo);
  const amostra = {
    nome: exemplo?.nome ?? "Nome Completo da Pessoa",
    horas: formatarHoras(exemplo?.horas ?? 8),
    evento: eventoNome,
    data_emissao: formatarData(new Date().toISOString()),
    tipo: m.tipo,
    codigo: "JES-7K2P-91QD",
    link_validacao: `${origin.replace(/^https?:\/\//, "")}/validar`,
  };
  const usados = camposUsados(m.blocos);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {modelos.map((x) => (
          <Link
            key={x.tipo}
            href={`/admin/certificados?etapa=modelos&tipo=${encodeURIComponent(x.tipo)}`}
            className={`inline-flex h-10 items-center gap-2 rounded-[10px] px-3.5 font-semibold ${
              x.tipo === m.tipo ? "border-2 border-primary bg-primary-soft text-primary-ink" : "border border-field bg-white text-body"
            }`}
          >
            {x.tipo}
            <span className={x.imagem_path ? "badge-ok py-0.5 text-[11px]" : "badge-warn py-0.5 text-[11px]"}>{x.imagem_path ? "Com arte" : "Sem arte"}</span>
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap items-start gap-5">
        <section className="card flex min-w-0 flex-[1_1_300px] flex-col gap-4 p-5">
          <h2 className="text-[17px] font-semibold">Arte · {m.tipo}</h2>
          <UploadArteForm key={m.tipo} tipo={m.tipo} temArte={!!m.imagem_path} />
          {m.imagem_path && (
            <form action={removerArte}>
              <input type="hidden" name="tipo" value={m.tipo} />
              <BotaoConfirmar mensagem="Remover a arte deste tipo? Os textos continuam." className="btn-link text-sm text-bad">
                Remover arte
              </BotaoConfirmar>
            </form>
          )}
          <div className="flex flex-col gap-2 border-t border-line pt-4">
            <span className="font-semibold">Campos neste modelo</span>
            {CAMPOS.map((c) => (
              <div key={c} className="flex items-center justify-between gap-2 rounded-lg bg-[#f8f9fb] px-2.5 py-2">
                <span className="font-mono text-[13px] font-semibold text-primary-ink">{`{{${c}}}`}</span>
                <span className="flex-1 text-right text-xs text-body">{DESC_CAMPOS[c]}</span>
                {usados.has(c) ? <span className="badge-ok py-0.5 text-[11px]">Usado</span> : <span className="badge-neutral py-0.5 text-[11px]">Livre</span>}
              </div>
            ))}
            <p className="text-[13px] leading-relaxed text-muted">
              Escreva os campos nos textos do modelo. Na emissão, cada campo vira o dado da pessoa. O QR code de validação é colocado à parte e pode ser
              arrastado.
            </p>
          </div>
          <div className="flex flex-col gap-3 border-t border-line pt-4">
            <NovoTipoForm />
            {m.tipo !== "Participante" && (
              <form action={excluirTipo}>
                <input type="hidden" name="tipo" value={m.tipo} />
                <BotaoConfirmar mensagem={`Excluir o tipo "${m.tipo}"?`} className="btn-link text-sm text-bad">
                  Excluir o tipo &quot;{m.tipo}&quot;
                </BotaoConfirmar>
              </form>
            )}
          </div>
        </section>
        <div className="min-w-0 flex-[999_1_480px]">
          <EditorModelo
            key={`${m.tipo}-${m.updated_at}`}
            tipo={m.tipo}
            imagemUrl={imagemUrl}
            imgW={m.imagem_largura}
            imgH={m.imagem_altura}
            blocosIniciais={m.blocos}
            qrInicial={m.qr}
            amostra={amostra}
          />
        </div>
      </div>
    </>
  );
}

// ------------------------------------------------------------------

function EtapaRegra({
  config,
  totalDias,
  participantes,
  tipos,
  extras,
}: {
  config: Awaited<ReturnType<typeof calcularDestinatarios>>["config"];
  totalDias: number;
  participantes: { nome: string; dias: number; horas: number | null }[];
  tipos: string[];
  extras: PessoaExtra[];
}) {
  const recebem = participantes.filter((p) => p.horas !== null).length;
  return (
    <>
      <div className="flex flex-wrap items-start gap-5">
        <section className="card flex min-w-0 flex-[1_1_320px] flex-col gap-4 p-5">
          <h2 className="text-[17px] font-semibold">Regra de carga horária dos participantes</h2>
          <RegraForm regra={config.regra} percentual={config.regra_percentual} horasPorDia={Number(config.horas_por_dia)} evento={config.evento_nome} />
          <div className="flex flex-col gap-1 rounded-[10px] bg-ground p-3.5">
            <span className="text-xl font-bold">
              {recebem} de {participantes.length}
            </span>
            <span className="text-muted">
              participantes que marcaram presença recebem certificado ({totalDias} {totalDias === 1 ? "dia" : "dias"} no evento, {formatarHoras(totalDias * Number(config.horas_por_dia))}h no total)
            </span>
          </div>
        </section>
        <section className="card min-w-0 flex-[1_1_360px] overflow-x-auto">
          <h2 className="px-4 pb-2 pt-5 text-[17px] font-semibold">Resultado por participante</h2>
          {participantes.length === 0 ? (
            <p className="px-4 pb-5 text-muted">Ninguém marcou presença ainda.</p>
          ) : (
            <table className="rtable">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Dias completos</th>
                  <th>Certificado</th>
                </tr>
              </thead>
              <tbody>
                {participantes.map((p) => (
                  <tr key={p.nome + p.dias}>
                    <td className="rt-full font-semibold">{p.nome}</td>
                    <td data-label="Dias completos">
                      {p.dias} de {totalDias}
                    </td>
                    <td data-label="Certificado" className={`font-semibold ${p.horas !== null ? "text-ok" : "text-muted"}`}>
                      {p.horas !== null ? `${formatarHoras(p.horas)}h` : "Sem certificado"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      <section className="card flex flex-col gap-4 p-5">
        <div className="flex flex-col gap-1">
          <h2 className="text-[17px] font-semibold">Palestrantes, organizadores e outros</h2>
          <p className="text-sm text-muted">
            Não precisam de conta. Se a pessoa tiver conta com o mesmo e-mail, o certificado também aparece nela. Para um tipo novo (ex.: Monitor), crie em Modelos.
          </p>
        </div>
        <PessoaForm tipos={tipos} />
        {extras.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="rtable md:min-w-[620px]">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th>Tipo</th>
                  <th>Carga horária</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {extras.map((p) => (
                  <tr key={p.id}>
                    <td className="rt-full font-semibold">{p.nome}</td>
                    <td data-label="E-mail">{p.email}</td>
                    <td data-label="Tipo">{p.tipo}</td>
                    <td data-label="Carga horária">{formatarHoras(Number(p.horas))}h</td>
                    <td data-label="">
                      <form action={removerPessoa} className="flex justify-end">
                        <input type="hidden" name="id" value={p.id} />
                        <BotaoConfirmar mensagem={`Remover ${p.nome}?`} className="btn-danger min-h-9 px-3 text-xs">
                          Remover
                        </BotaoConfirmar>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

// ------------------------------------------------------------------

function EtapaEmitir({
  modelosSemArte,
  total,
  liberados,
  liberadosEm,
  regraTexto,
  certs,
}: {
  modelosSemArte: string[];
  total: number;
  liberados: boolean;
  liberadosEm: string | null;
  regraTexto: string;
  certs: Certificado[];
}) {
  const checklist = [
    { ok: modelosSemArte.length === 0, texto: modelosSemArte.length === 0 ? "Todos os tipos com pessoas têm arte enviada" : `Sem arte (sai com moldura simples): ${modelosSemArte.join(", ")}` },
    { ok: true, texto: `Regra: ${regraTexto}` },
    { ok: total > 0, texto: total > 0 ? `${total} pessoas recebem certificado` : "Ninguém se encaixa na regra ainda" },
    { ok: true, texto: "Cada certificado ganha código único e QR code de validação" },
  ];
  return (
    <>
      <section className="card flex max-w-3xl flex-col gap-3.5 p-5">
        <h2 className="text-[17px] font-semibold">{certs.length ? "Situação" : "Antes de emitir"}</h2>
        {checklist.map((c) => (
          <div key={c.texto} className="flex items-start gap-2.5">
            <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${c.ok ? "bg-ok-soft text-ok" : "bg-warn-soft text-warn"}`}>
              {c.ok ? "✓" : "!"}
            </span>
            <span className="leading-snug">{c.texto}</span>
          </div>
        ))}
        {total > 0 && <EmitirForm total={total} jaEmitido={certs.length > 0} />}
        {certs.length > 0 && (
          <form action={alternarLiberacao} className="flex flex-wrap items-center gap-3 border-t border-line pt-3.5">
            <input type="hidden" name="liberar" value={liberados ? "0" : "1"} />
            <span className={liberados ? "badge-ok" : "badge-warn"}>
              {liberados ? `Liberados nas contas${liberadosEm ? ` desde ${formatarDataHora(liberadosEm)}` : ""}` : "Ocultos dos participantes"}
            </span>
            <BotaoEnviar className="btn-secondary min-h-10 text-sm">{liberados ? "Ocultar dos participantes" : "Liberar nas contas"}</BotaoEnviar>
          </form>
        )}
      </section>

      {certs.length > 0 && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[19px] font-semibold">Certificados emitidos ({certs.length})</h2>
            <div className="flex flex-wrap gap-2">
              <a href="/api/admin/certificados/zip" className="btn-secondary">
                Baixar todos (ZIP)
              </a>
              <a href="/api/admin/export?tipo=certificados" className="btn-secondary">
                Planilha (CSV)
              </a>
            </div>
          </div>
          <div className="card overflow-x-auto">
            <table className="rtable md:min-w-[820px]">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Tipo</th>
                  <th>Horas</th>
                  <th>Código de validação</th>
                  <th>Situação</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {certs.map((c) => (
                  <tr key={c.id}>
                    <td className="rt-full">
                      <div className="flex flex-col">
                        <span className="font-semibold">{c.nome}</span>
                        <span className="text-xs text-muted">{c.email}</span>
                      </div>
                    </td>
                    <td data-label="Tipo">{c.tipo}</td>
                    <td data-label="Horas">{formatarHoras(Number(c.horas))}h</td>
                    <td data-label="Código" className={`font-mono font-semibold ${c.invalidado ? "text-muted line-through" : ""}`}>
                      {c.codigo}
                    </td>
                    <td data-label="Situação">{c.invalidado ? <span className="badge-bad">Invalidado</span> : <span className="badge-ok">Válido</span>}</td>
                    <td data-label="">
                      <div className="flex justify-end gap-2 md:justify-start">
                        <a href={`/api/certificados/${c.codigo}/pdf`} target="_blank" rel="noreferrer" className="btn-secondary min-h-9 px-3 text-sm">
                          PDF
                        </a>
                        <form action={alternarInvalidado}>
                          <input type="hidden" name="id" value={c.id} />
                          <input type="hidden" name="invalidar" value={c.invalidado ? "0" : "1"} />
                          {c.invalidado ? (
                            <BotaoEnviar className="btn-secondary min-h-9 px-3 text-sm">Reativar</BotaoEnviar>
                          ) : (
                            <BotaoConfirmar mensagem={`Invalidar o certificado de ${c.nome}? A página de validação passa a mostrar "inválido".`} className="btn-danger min-h-9 px-3 text-sm">
                              Invalidar
                            </BotaoConfirmar>
                          )}
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-muted">Certificado invalidado aparece como &quot;inválido&quot; na página pública de validação.</p>
        </>
      )}
    </>
  );
}
