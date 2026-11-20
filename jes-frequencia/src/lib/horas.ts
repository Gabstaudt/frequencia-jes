import type { Regra } from "./types";

export type FreqMin = { id: string; dia: number };
export type PresMin = { frequencia_id: string; user_id: string };

/**
 * Um dia conta como completo só se a pessoa marcou TODAS as frequências daquele dia
 * (no JES, as 2 marcações). Com uma só, o dia é perdido.
 */
export function diasCompletosPorUsuario(freqs: FreqMin[], presencas: PresMin[]) {
  const porDia = new Map<number, Set<string>>();
  for (const f of freqs) {
    if (!porDia.has(f.dia)) porDia.set(f.dia, new Set());
    porDia.get(f.dia)!.add(f.id);
  }
  const marcadas = new Map<string, Set<string>>();
  for (const p of presencas) {
    if (!marcadas.has(p.user_id)) marcadas.set(p.user_id, new Set());
    marcadas.get(p.user_id)!.add(p.frequencia_id);
  }
  const resultado = new Map<string, number>();
  for (const [uid, set] of marcadas) {
    let completos = 0;
    for (const ids of porDia.values()) {
      if (ids.size > 0 && [...ids].every((id) => set.has(id))) completos++;
    }
    resultado.set(uid, completos);
  }
  return { resultado, totalDias: porDia.size };
}

/**
 * Aplica a regra do certificado. Retorna as horas do certificado, ou null se a pessoa não recebe.
 * - soma: horas = dias completos × horas por dia (precisa de ao menos 1 dia).
 * - percentual: acima de X% dos dias completos → carga horária cheia do evento.
 * - minimo: a partir de X% dos dias completos → soma das horas.
 */
export function horasDoCertificado(
  diasCompletos: number,
  totalDias: number,
  horasPorDia: number,
  regra: Regra,
  percentual: number,
): number | null {
  if (totalDias <= 0 || diasCompletos <= 0) return null;
  const pct = (diasCompletos / totalDias) * 100;
  const soma = diasCompletos * horasPorDia;
  if (regra === "soma") return soma;
  if (regra === "percentual") return pct > percentual ? totalDias * horasPorDia : null;
  return pct >= percentual ? soma : null;
}

export function descricaoRegra(regra: Regra, percentual: number, horasPorDia: number) {
  if (regra === "soma") return `Cada dia completo soma ${horasPorDia}h. Quem tem ao menos 1 dia completo recebe certificado.`;
  if (regra === "percentual")
    return `Acima de ${percentual}% dos dias completos, recebe a carga horária cheia do evento. Abaixo disso, não recebe.`;
  return `Quem atinge ${percentual}% dos dias completos recebe a soma das horas (${horasPorDia}h por dia completo). Abaixo disso, não recebe.`;
}
