"use server";

import { revalidatePath } from "next/cache";
import { getSessao } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { normalizarPalavra, statusDaFrequencia } from "@/lib/frequencia";
import type { Frequencia } from "@/lib/types";

export type MarcarState = {
  erro?: string;
  ok?: boolean;
  hora?: string;
  diaFeitas?: number;
  diaTotal?: number;
  dia?: number;
};

export async function marcarPresenca(_: MarcarState, fd: FormData): Promise<MarcarState> {
  const { user } = await getSessao();
  if (!user) return { erro: "Sua sessão expirou. Entre de novo." };

  const id = String(fd.get("frequencia_id") ?? "");
  const palavra = String(fd.get("palavra") ?? "");
  if (!palavra.trim()) return { erro: "Digite a palavra-chave." };

  const db = createAdminClient();
  const { data: f } = await db.from("frequencias").select("*").eq("id", id).maybeSingle<Frequencia>();
  if (!f) return { erro: "Frequência não encontrada." };

  const status = statusDaFrequencia(f);
  if (status === "programada") return { erro: "Esta frequência ainda não foi liberada." };
  if (status === "fechada") return { erro: "A organização encerrou esta frequência." };

  if (normalizarPalavra(palavra) !== normalizarPalavra(f.palavra_chave)) {
    return { erro: "Palavra-chave incorreta. Confira e tente de novo." };
  }

  const { data: inserida, error } = await db
    .from("presencas")
    .insert({ frequencia_id: f.id, user_id: user.id, origem: "palavra" })
    .select("created_at")
    .single();

  let criadoEm = inserida?.created_at as string | undefined;
  if (error) {
    if (error.code !== "23505") return { erro: "Não foi possível registrar agora. Tente de novo." };
    const { data: existente } = await db
      .from("presencas")
      .select("created_at")
      .eq("frequencia_id", f.id)
      .eq("user_id", user.id)
      .single();
    criadoEm = existente?.created_at;
  }

  const { data: doDia } = await db.from("frequencias").select("id").eq("dia", f.dia);
  const ids = (doDia ?? []).map((x) => x.id);
  const { count } = await db
    .from("presencas")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .in("frequencia_id", ids);

  revalidatePath("/inicio");
  return { ok: true, hora: criadoEm, diaFeitas: count ?? 0, diaTotal: ids.length, dia: f.dia };
}
