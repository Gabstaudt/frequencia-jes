import "server-only";
import { createAdminClient } from "./supabase/server";
import type { Config, FrequenciaPublica } from "./types";

export const COLUNAS_PUBLICAS = "id,nome,dia,marcacao,desbloqueio_em,fechada,created_at";

export async function listarFrequenciasPublicas() {
  const db = createAdminClient();
  const { data, error } = await db
    .from("frequencias")
    .select(COLUNAS_PUBLICAS)
    .order("dia")
    .order("marcacao")
    .order("desbloqueio_em");
  if (error) throw error;
  return (data ?? []) as FrequenciaPublica[];
}

export async function presencasDoUsuario(userId: string) {
  const db = createAdminClient();
  const { data, error } = await db.from("presencas").select("frequencia_id,created_at,origem").eq("user_id", userId);
  if (error) throw error;
  return data ?? [];
}

export async function getConfig() {
  const db = createAdminClient();
  const { data, error } = await db.from("config").select("*").eq("id", 1).single<Config>();
  if (error) throw error;
  return data;
}

/**
 * O Supabase devolve no máximo 1000 linhas por consulta. Esta função busca
 * página por página até trazer tudo (para eventos com muitos participantes).
 */
export async function buscarTodos<T>(
  consulta: (de: number, ate: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const tamanho = 1000;
  const tudo: T[] = [];
  for (let de = 0; ; de += tamanho) {
    const { data, error } = await consulta(de, de + tamanho - 1);
    if (error) throw error;
    tudo.push(...(data ?? []));
    if (!data || data.length < tamanho) break;
  }
  return tudo;
}

export type PerfilResumo = {
  id: string;
  nome: string;
  email: string;
  data_nascimento: string | null;
  estuda: boolean;
  universidade: string | null;
  estado: string | null;
  is_admin: boolean;
};

export function todosPerfis() {
  const db = createAdminClient();
  return buscarTodos<PerfilResumo>((de, ate) =>
    db.from("profiles").select("id,nome,email,data_nascimento,estuda,universidade,estado,is_admin").order("nome").range(de, ate),
  );
}

export type PresencaResumo = { frequencia_id: string; user_id: string; origem: string; marcado_por: string | null; created_at: string };

export function todasPresencas(frequenciaId?: string) {
  const db = createAdminClient();
  return buscarTodos<PresencaResumo>((de, ate) => {
    let q = db.from("presencas").select("frequencia_id,user_id,origem,marcado_por,created_at").order("created_at");
    if (frequenciaId) q = q.eq("frequencia_id", frequenciaId);
    return q.range(de, ate);
  });
}

export function agruparPorDia<T extends { dia: number }>(lista: T[]) {
  const mapa = new Map<number, T[]>();
  for (const item of lista) {
    if (!mapa.has(item.dia)) mapa.set(item.dia, []);
    mapa.get(item.dia)!.push(item);
  }
  return [...mapa.entries()].sort((a, b) => a[0] - b[0]);
}
