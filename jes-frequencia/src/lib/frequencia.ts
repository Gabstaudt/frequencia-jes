import type { FrequenciaPublica } from "./types";

export type StatusFrequencia = "programada" | "aberta" | "fechada";

export function statusDaFrequencia(f: Pick<FrequenciaPublica, "desbloqueio_em" | "fechada">, agora = new Date()): StatusFrequencia {
  if (f.fechada) return "fechada";
  if (new Date(f.desbloqueio_em).getTime() > agora.getTime()) return "programada";
  return "aberta";
}

const TZ = "America/Belem";

export function formatarDataHora(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatarHora(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

export function formatarData(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(iso));
}

/** Converte "2026-11-25T09:00" (hora local do evento) em ISO UTC. */
export function localParaIso(valor: string) {
  // America/Belem é UTC-03:00 o ano todo (sem horário de verão).
  return new Date(`${valor}:00-03:00`).toISOString();
}

/** Converte ISO UTC em "2026-11-25T09:00" no fuso do evento, para inputs datetime-local. */
export function isoParaLocal(iso: string) {
  const d = new Date(new Date(iso).getTime() - 3 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 16);
}

export function normalizarPalavra(p: string) {
  return p
    .trim()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase();
}

export const ESTADOS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
  "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];
