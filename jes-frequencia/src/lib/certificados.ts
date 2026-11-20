import "server-only";
import { buscarTodos, getConfig, todasPresencas, todosPerfis } from "./dados";
import { formatarData } from "./frequencia";
import { diasCompletosPorUsuario, horasDoCertificado } from "./horas";
import { gerarPdf, type DadosCertificado } from "./pdf";
import { createAdminClient } from "./supabase/server";
import type { Certificado, Config, ModeloCertificado, PessoaExtra } from "./types";
import { gerarCodigo } from "./codigo";

export function formatarHoras(h: number) {
  return Number.isInteger(h) ? String(h) : String(h).replace(".", ",");
}

export async function listarModelos() {
  const db = createAdminClient();
  const { data } = await db.from("modelos_certificado").select("*").order("tipo");
  const ordem = ["Participante", "Palestrante", "Organizador"];
  return ((data ?? []) as ModeloCertificado[]).sort((a, b) => {
    const ia = ordem.indexOf(a.tipo), ib = ordem.indexOf(b.tipo);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.tipo.localeCompare(b.tipo);
  });
}

export async function baixarImagemModelo(m: ModeloCertificado) {
  if (!m.imagem_path || !m.imagem_largura || !m.imagem_altura) return null;
  const db = createAdminClient();
  const { data } = await db.storage.from("modelos").download(m.imagem_path);
  if (!data) return null;
  const bytes = new Uint8Array(await data.arrayBuffer());
  const tipo: "png" | "jpg" = m.imagem_path.endsWith(".png") ? "png" : "jpg";
  return { bytes, tipo, largura: m.imagem_largura, altura: m.imagem_altura };
}

export function dadosDoCertificado(
  c: Pick<Certificado, "nome" | "horas" | "tipo" | "codigo" | "emitido_em">,
  config: Pick<Config, "evento_nome">,
  origin: string,
): DadosCertificado {
  return {
    nome: c.nome,
    horas: formatarHoras(Number(c.horas)),
    evento: config.evento_nome,
    data_emissao: formatarData(c.emitido_em),
    tipo: c.tipo,
    codigo: c.codigo,
    link_validacao: `${origin.replace(/^https?:\/\//, "")}/validar`,
  };
}

export async function pdfDoCertificado(c: Certificado, origin: string, cacheImagens = new Map<string, Awaited<ReturnType<typeof baixarImagemModelo>>>()) {
  const db = createAdminClient();
  const config = await getConfig();
  const { data: modelo } = await db.from("modelos_certificado").select("*").eq("tipo", c.tipo).maybeSingle<ModeloCertificado>();
  const m = modelo ?? (await db.from("modelos_certificado").select("*").eq("tipo", "Participante").single<ModeloCertificado>()).data!;
  if (!cacheImagens.has(m.tipo)) cacheImagens.set(m.tipo, await baixarImagemModelo(m));
  return gerarPdf({
    imagem: cacheImagens.get(m.tipo) ?? null,
    blocos: m.blocos,
    qr: m.qr,
    dados: dadosDoCertificado(c, config, origin),
    urlValidacao: `${origin}/validar/${c.codigo}`,
  });
}

export type Destinatario = {
  tipo: string;
  nome: string;
  email: string;
  horas: number;
  user_id: string | null;
  pessoa_extra_id: string | null;
  diasCompletos?: number;
};

/** Quem recebe certificado agora, pela regra configurada + pessoas extras. */
export async function calcularDestinatarios() {
  const db = createAdminClient();
  const [config, perfis, pres, { data: fs }, { data: extras }] = await Promise.all([
    getConfig(),
    todosPerfis(),
    todasPresencas(),
    db.from("frequencias").select("id,dia"),
    db.from("pessoas_extras").select("*").order("nome"),
  ]);
  const { resultado, totalDias } = diasCompletosPorUsuario(fs ?? [], pres);
  // Todo mundo que marcou ao menos uma presença entra na conta.
  const participantes = perfis
    .filter((p) => resultado.has(p.id))
    .map((p) => {
      const dias = resultado.get(p.id) ?? 0;
      const horas = horasDoCertificado(dias, totalDias, Number(config.horas_por_dia), config.regra, config.regra_percentual);
      return { perfil: p, dias, horas };
    });

  const destinatarios: Destinatario[] = [];
  for (const x of participantes) {
    if (x.horas === null) continue;
    destinatarios.push({ tipo: "Participante", nome: x.perfil.nome, email: x.perfil.email, horas: x.horas, user_id: x.perfil.id, pessoa_extra_id: null, diasCompletos: x.dias });
  }
  for (const e of (extras ?? []) as PessoaExtra[]) {
    destinatarios.push({ tipo: e.tipo, nome: e.nome, email: e.email.toLowerCase(), horas: Number(e.horas), user_id: null, pessoa_extra_id: e.id });
  }
  return { config, totalDias, participantes, destinatarios };
}

/** Gera/atualiza os certificados. Mantém o código de quem já tinha. */
export async function emitirCertificados() {
  const db = createAdminClient();
  const { destinatarios } = await calcularDestinatarios();
  const existentes = await buscarTodos<Certificado>((de, ate) => db.from("certificados").select("*").range(de, ate));

  const chave = (c: { user_id: string | null; pessoa_extra_id: string | null; tipo: string }) =>
    c.pessoa_extra_id ? `x:${c.pessoa_extra_id}` : `u:${c.user_id}:${c.tipo}`;
  const porChave = new Map(existentes.map((c) => [chave(c), c]));
  const manter = new Set<string>();
  const codigos = new Set(existentes.map((c) => c.codigo));

  for (const d of destinatarios) {
    const k = chave(d);
    manter.add(k);
    const ex = porChave.get(k);
    if (ex) {
      if (ex.nome !== d.nome || ex.email !== d.email || Number(ex.horas) !== d.horas || ex.tipo !== d.tipo) {
        await db.from("certificados").update({ nome: d.nome, email: d.email, horas: d.horas, tipo: d.tipo }).eq("id", ex.id);
      }
      continue;
    }
    let codigo = gerarCodigo();
    while (codigos.has(codigo)) codigo = gerarCodigo();
    codigos.add(codigo);
    const { error } = await db.from("certificados").insert({
      codigo, tipo: d.tipo, nome: d.nome, email: d.email, horas: d.horas, user_id: d.user_id, pessoa_extra_id: d.pessoa_extra_id,
    });
    if (error) throw error;
  }

  // Quem não se encaixa mais na regra perde o certificado (os invalidados ficam registrados).
  const remover = existentes.filter((c) => !manter.has(chave(c)) && !c.invalidado).map((c) => c.id);
  if (remover.length) await db.from("certificados").delete().in("id", remover);

  await db.from("config").update({ certificados_liberados: true, liberados_em: new Date().toISOString() }).eq("id", 1);
  return destinatarios.length;
}
