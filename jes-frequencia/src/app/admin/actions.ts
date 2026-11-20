"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { garantirAdmin } from "@/lib/auth";
import { localParaIso } from "@/lib/frequencia";
import { createAdminClient } from "@/lib/supabase/server";

export type AdminState = { erro?: string; ok?: string };

function txt(fd: FormData, k: string) {
  return String(fd.get(k) ?? "").trim();
}

function lerFrequencia(fd: FormData) {
  const nome = txt(fd, "nome");
  const dia = Number(txt(fd, "dia"));
  const marcacao = Number(txt(fd, "marcacao"));
  const palavra = txt(fd, "palavra_chave");
  const data = txt(fd, "data");
  const hora = txt(fd, "hora");
  if (!nome) return { erro: "Informe o nome da frequência." } as const;
  if (!Number.isInteger(dia) || dia < 1) return { erro: "Informe o dia do evento." } as const;
  if (!Number.isInteger(marcacao) || marcacao < 1) return { erro: "Informe a marcação." } as const;
  if (palavra.length < 2) return { erro: "A palavra-chave precisa ter pelo menos 2 caracteres." } as const;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || !/^\d{2}:\d{2}$/.test(hora)) return { erro: "Informe data e hora de desbloqueio." } as const;
  return {
    valores: { nome, dia, marcacao, palavra_chave: palavra, desbloqueio_em: localParaIso(`${data}T${hora}`) },
  } as const;
}

// ---------------- Frequências ----------------

export async function criarFrequencia(_: AdminState, fd: FormData): Promise<AdminState> {
  await garantirAdmin();
  const r = lerFrequencia(fd);
  if ("erro" in r) return { erro: r.erro };
  const db = createAdminClient();
  const { data, error } = await db.from("frequencias").insert(r.valores).select("id").single();
  if (error) return { erro: "Não foi possível criar a frequência." };
  revalidatePath("/admin/frequencias");
  redirect(`/admin/frequencias/${data.id}?criada=1`);
}

export async function atualizarFrequencia(_: AdminState, fd: FormData): Promise<AdminState> {
  await garantirAdmin();
  const id = txt(fd, "id");
  const r = lerFrequencia(fd);
  if ("erro" in r) return { erro: r.erro };
  const db = createAdminClient();
  const { error } = await db.from("frequencias").update(r.valores).eq("id", id);
  if (error) return { erro: "Não foi possível salvar." };
  revalidatePath(`/admin/frequencias/${id}`);
  revalidatePath("/admin/frequencias");
  return { ok: "Alterações salvas." };
}

/** acao: "fechar" | "reabrir" | "abrir_agora" */
export async function mudarStatusFrequencia(fd: FormData) {
  await garantirAdmin();
  const id = txt(fd, "id");
  const acao = txt(fd, "acao");
  const db = createAdminClient();
  if (acao === "fechar") await db.from("frequencias").update({ fechada: true }).eq("id", id);
  if (acao === "reabrir") await db.from("frequencias").update({ fechada: false }).eq("id", id);
  if (acao === "abrir_agora") await db.from("frequencias").update({ fechada: false, desbloqueio_em: new Date().toISOString() }).eq("id", id);
  revalidatePath("/admin/frequencias");
  revalidatePath(`/admin/frequencias/${id}`);
}

export async function excluirFrequencia(fd: FormData) {
  await garantirAdmin();
  const id = txt(fd, "id");
  const db = createAdminClient();
  await db.from("frequencias").delete().eq("id", id);
  revalidatePath("/admin/frequencias");
  redirect("/admin/frequencias");
}

// ---------------- Presença manual ----------------

export async function marcarPresencaManual(fd: FormData) {
  const admin = await garantirAdmin();
  const frequenciaId = txt(fd, "frequencia_id");
  const userId = txt(fd, "user_id");
  const db = createAdminClient();
  await db
    .from("presencas")
    .upsert(
      { frequencia_id: frequenciaId, user_id: userId, origem: "manual", marcado_por: admin.id },
      { onConflict: "frequencia_id,user_id", ignoreDuplicates: true },
    );
  revalidatePath("/admin/presencas");
  revalidatePath(`/admin/frequencias/${frequenciaId}`);
}

export async function removerPresenca(fd: FormData) {
  await garantirAdmin();
  const frequenciaId = txt(fd, "frequencia_id");
  const userId = txt(fd, "user_id");
  const db = createAdminClient();
  await db.from("presencas").delete().eq("frequencia_id", frequenciaId).eq("user_id", userId);
  revalidatePath("/admin/presencas");
  revalidatePath(`/admin/frequencias/${frequenciaId}`);
}

// ---------------- Admins ----------------

export async function adicionarAdmin(_: AdminState, fd: FormData): Promise<AdminState> {
  const eu = await garantirAdmin();
  if (!eu.is_master) return { erro: "Só a admin master adiciona admins." };
  const email = txt(fd, "email").toLowerCase();
  if (!email) return { erro: "Informe o e-mail." };
  const db = createAdminClient();
  const { data: p } = await db.from("profiles").select("id,is_admin").ilike("email", email).maybeSingle();
  if (!p) return { erro: "Não há conta com esse e-mail. Peça para a pessoa criar a conta no site primeiro." };
  if (p.is_admin) return { erro: "Essa pessoa já é admin." };
  await db.from("profiles").update({ is_admin: true }).eq("id", p.id);
  revalidatePath("/admin/admins");
  return { ok: "Admin adicionado." };
}

export async function removerAdmin(fd: FormData) {
  const eu = await garantirAdmin();
  if (!eu.is_master) throw new Error("Só a admin master remove admins.");
  const id = txt(fd, "id");
  if (id === eu.id) throw new Error("Você não pode remover a si mesma.");
  const db = createAdminClient();
  await db.from("profiles").update({ is_admin: false, is_master: false }).eq("id", id);
  revalidatePath("/admin/admins");
}
