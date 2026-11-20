"use server";

import { revalidatePath } from "next/cache";
import { garantirAdmin } from "@/lib/auth";
import { emitirCertificados } from "@/lib/certificados";
import { dimensoesImagem } from "@/lib/pdf";
import { createAdminClient } from "@/lib/supabase/server";
import type { BlocoQr, BlocoTexto } from "@/lib/types";

export type CertState = { erro?: string; ok?: string };

const R = "/admin/certificados";

function txt(fd: FormData, k: string) {
  return String(fd.get(k) ?? "").trim();
}

// ---------- Modelos ----------

export async function enviarArte(_: CertState, fd: FormData): Promise<CertState> {
  await garantirAdmin();
  const tipo = txt(fd, "tipo");
  const arquivo = fd.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) return { erro: "Escolha um arquivo PNG ou JPG." };
  if (arquivo.size > 4 * 1024 * 1024) return { erro: "A imagem precisa ter até 4 MB. Exporte em JPG ou com resolução menor." };
  const ext = arquivo.type === "image/png" ? "png" : arquivo.type === "image/jpeg" ? "jpg" : null;
  if (!ext) return { erro: "Use uma imagem PNG ou JPG (exporte a arte do Canva, PowerPoint ou Word como imagem)." };

  const bytes = new Uint8Array(await arquivo.arrayBuffer());
  let dims: { largura: number; altura: number };
  try {
    dims = await dimensoesImagem(bytes, ext);
  } catch {
    return { erro: "Não consegui ler essa imagem. Tente exportar de novo como PNG." };
  }

  const db = createAdminClient();
  const { data: atual } = await db.from("modelos_certificado").select("imagem_path").eq("tipo", tipo).single();
  const path = `${tipo.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}.${ext}`;
  const { error } = await db.storage.from("modelos").upload(path, bytes, { contentType: arquivo.type, upsert: true });
  if (error) return { erro: "Falha ao enviar a imagem. Confira se o bucket 'modelos' existe no Supabase." };
  await db.from("modelos_certificado").update({ imagem_path: path, imagem_largura: dims.largura, imagem_altura: dims.altura, updated_at: new Date().toISOString() }).eq("tipo", tipo);
  if (atual?.imagem_path) await db.storage.from("modelos").remove([atual.imagem_path]);
  revalidatePath(R);
  return { ok: "Arte enviada. Agora posicione os campos sobre ela." };
}

export async function removerArte(fd: FormData) {
  await garantirAdmin();
  const tipo = txt(fd, "tipo");
  const db = createAdminClient();
  const { data: atual } = await db.from("modelos_certificado").select("imagem_path").eq("tipo", tipo).single();
  if (atual?.imagem_path) await db.storage.from("modelos").remove([atual.imagem_path]);
  await db.from("modelos_certificado").update({ imagem_path: null, imagem_largura: null, imagem_altura: null }).eq("tipo", tipo);
  revalidatePath(R);
}

export async function salvarModelo(tipo: string, blocos: BlocoTexto[], qr: BlocoQr): Promise<CertState> {
  await garantirAdmin();
  const limpo = blocos.map((b) => ({
    id: String(b.id).slice(0, 40),
    texto: String(b.texto).slice(0, 2000),
    x: Math.max(0, Math.min(100, Number(b.x) || 0)),
    y: Math.max(0, Math.min(100, Number(b.y) || 0)),
    largura: Math.max(5, Math.min(100, Number(b.largura) || 50)),
    tamanho: Math.max(4, Math.min(120, Number(b.tamanho) || 12)),
    alinhamento: ["esquerda", "centro", "direita"].includes(b.alinhamento) ? b.alinhamento : "centro",
    fonte: ["helvetica", "times", "courier"].includes(b.fonte) ? b.fonte : "helvetica",
    negrito: !!b.negrito,
    cor: /^#[0-9a-f]{6}$/i.test(b.cor) ? b.cor : "#151922",
  }));
  const q = {
    x: Math.max(0, Math.min(100, Number(qr.x) || 0)),
    y: Math.max(0, Math.min(100, Number(qr.y) || 0)),
    tamanho: Math.max(4, Math.min(40, Number(qr.tamanho) || 11)),
    ativo: !!qr.ativo,
  };
  const db = createAdminClient();
  const { error } = await db.from("modelos_certificado").update({ blocos: limpo, qr: q, updated_at: new Date().toISOString() }).eq("tipo", tipo);
  if (error) return { erro: "Não foi possível salvar o modelo." };
  revalidatePath(R);
  return { ok: "Modelo salvo." };
}

export async function criarTipo(_: CertState, fd: FormData): Promise<CertState> {
  await garantirAdmin();
  const tipo = txt(fd, "tipo").replace(/\s+/g, " ");
  if (tipo.length < 2) return { erro: "Informe o nome do tipo (ex.: Monitor)." };
  const db = createAdminClient();
  const { data: base } = await db.from("modelos_certificado").select("blocos,qr").eq("tipo", "Participante").maybeSingle();
  const blocos = ((base?.blocos ?? []) as BlocoTexto[]).map((b) =>
    b.id === "corpo" ? { ...b, texto: `Certificamos que {{nome}} atuou como ${tipo.toLowerCase()} no {{evento}}, com carga horária de {{horas}} horas.` } : b,
  );
  const { error } = await db.from("modelos_certificado").insert({ tipo, blocos, qr: base?.qr });
  if (error) return { erro: error.code === "23505" ? "Esse tipo já existe." : "Não foi possível criar o tipo." };
  revalidatePath(R);
  return { ok: `Tipo "${tipo}" criado.` };
}

export async function excluirTipo(fd: FormData) {
  await garantirAdmin();
  const tipo = txt(fd, "tipo");
  if (tipo === "Participante") return;
  const db = createAdminClient();
  const { data: atual } = await db.from("modelos_certificado").select("imagem_path").eq("tipo", tipo).single();
  if (atual?.imagem_path) await db.storage.from("modelos").remove([atual.imagem_path]);
  await db.from("modelos_certificado").delete().eq("tipo", tipo);
  revalidatePath(R);
}

// ---------- Regra ----------

export async function salvarRegra(_: CertState, fd: FormData): Promise<CertState> {
  await garantirAdmin();
  const regra = txt(fd, "regra");
  const pct = Number(txt(fd, "regra_percentual"));
  const hpd = Number(txt(fd, "horas_por_dia").replace(",", "."));
  const evento = txt(fd, "evento_nome");
  if (!["soma", "percentual", "minimo"].includes(regra)) return { erro: "Escolha uma regra." };
  if (!Number.isFinite(pct) || pct < 0 || pct > 100) return { erro: "O percentual vai de 0 a 100." };
  if (!Number.isFinite(hpd) || hpd <= 0) return { erro: "Informe as horas por dia." };
  if (!evento) return { erro: "Informe o nome do evento." };
  const db = createAdminClient();
  await db.from("config").update({ regra, regra_percentual: Math.round(pct), horas_por_dia: hpd, evento_nome: evento }).eq("id", 1);
  revalidatePath(R);
  return { ok: "Regra salva. Se os certificados já foram emitidos, emita de novo para aplicar." };
}

// ---------- Pessoas extras ----------

export async function adicionarPessoa(_: CertState, fd: FormData): Promise<CertState> {
  await garantirAdmin();
  const nome = txt(fd, "nome").replace(/\s+/g, " ");
  const email = txt(fd, "email").toLowerCase();
  const tipo = txt(fd, "tipo");
  const horas = Number(txt(fd, "horas").replace(",", "."));
  if (!nome) return { erro: "Informe o nome." };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { erro: "Informe um e-mail válido." };
  if (!tipo) return { erro: "Escolha o tipo." };
  if (!Number.isFinite(horas) || horas <= 0) return { erro: "Informe a carga horária." };
  const db = createAdminClient();
  const { error } = await db.from("pessoas_extras").insert({ nome, email, tipo, horas });
  if (error) return { erro: "Não foi possível adicionar." };
  revalidatePath(R);
  return { ok: `${nome} adicionado(a).` };
}

export async function removerPessoa(fd: FormData) {
  await garantirAdmin();
  const db = createAdminClient();
  await db.from("pessoas_extras").delete().eq("id", txt(fd, "id"));
  revalidatePath(R);
}

// ---------- Emissão ----------

export async function emitir(): Promise<CertState> {
  await garantirAdmin();
  try {
    const n = await emitirCertificados();
    revalidatePath(R);
    revalidatePath("/certificados");
    return { ok: `${n} certificados emitidos e liberados nas contas.` };
  } catch {
    return { erro: "Falha ao emitir. Tente de novo." };
  }
}

export async function alternarLiberacao(fd: FormData) {
  await garantirAdmin();
  const liberar = txt(fd, "liberar") === "1";
  const db = createAdminClient();
  await db.from("config").update({ certificados_liberados: liberar, liberados_em: liberar ? new Date().toISOString() : null }).eq("id", 1);
  revalidatePath(R);
  revalidatePath("/certificados");
}

export async function alternarInvalidado(fd: FormData) {
  await garantirAdmin();
  const id = txt(fd, "id");
  const invalidar = txt(fd, "invalidar") === "1";
  const db = createAdminClient();
  await db.from("certificados").update({ invalidado: invalidar, invalidado_em: invalidar ? new Date().toISOString() : null }).eq("id", id);
  revalidatePath(R);
}
