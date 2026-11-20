import type { BlocoTexto } from "./types";

export const CAMPOS = ["nome", "horas", "evento", "data_emissao", "tipo", "codigo", "link_validacao"] as const;
export type Campo = (typeof CAMPOS)[number];
export type DadosCertificado = Record<Campo, string>;

/** Tamanho da página em pontos. A4 (842 × 595), mantendo a proporção da arte. */
export function tamanhoPagina(larguraImg?: number | null, alturaImg?: number | null) {
  if (!larguraImg || !alturaImg) return { w: 841.89, h: 595.28 };
  if (larguraImg >= alturaImg) return { w: 841.89, h: (841.89 * alturaImg) / larguraImg };
  return { w: 595.28, h: (595.28 * alturaImg) / larguraImg };
}

export function preencher(texto: string, dados: Partial<DadosCertificado>) {
  return texto.replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k: string) => (k in dados ? String(dados[k as Campo] ?? "") : m));
}

export function camposUsados(blocos: BlocoTexto[]) {
  const set = new Set<string>();
  for (const b of blocos) for (const m of b.texto.matchAll(/\{\{\s*(\w+)\s*\}\}/g)) set.add(m[1]);
  return set;
}

