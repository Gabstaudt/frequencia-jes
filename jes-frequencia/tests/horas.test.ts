import assert from "node:assert/strict";
import { test } from "node:test";
import { diasCompletosPorUsuario, horasDoCertificado } from "../src/lib/horas";
import { normalizarPalavra, statusDaFrequencia, localParaIso, isoParaLocal } from "../src/lib/frequencia";
import { preencher, camposUsados } from "../src/lib/campos";

const freqs = [
  { id: "d1m1", dia: 1 },
  { id: "d1m2", dia: 1 },
  { id: "d2m1", dia: 2 },
  { id: "d2m2", dia: 2 },
];
const p = (u: string, ...ids: string[]) => ids.map((frequencia_id) => ({ user_id: u, frequencia_id }));

test("dia só conta com as duas marcações", () => {
  const pres = [...p("ana", "d1m1", "d1m2", "d2m1", "d2m2"), ...p("bruno", "d1m1", "d1m2", "d2m1"), ...p("cami", "d1m1", "d2m1")];
  const { resultado, totalDias } = diasCompletosPorUsuario(freqs, pres);
  assert.equal(totalDias, 2);
  assert.equal(resultado.get("ana"), 2);
  assert.equal(resultado.get("bruno"), 1);
  assert.equal(resultado.get("cami"), 0);
});

test("regra percentual: mais de 50% ganha carga cheia", () => {
  assert.equal(horasDoCertificado(2, 2, 4, "percentual", 50), 8);
  assert.equal(horasDoCertificado(1, 2, 4, "percentual", 50), null); // 50% não é "mais de 50%"
  assert.equal(horasDoCertificado(2, 3, 4, "percentual", 50), 12);
  assert.equal(horasDoCertificado(0, 2, 4, "percentual", 0), null);
});

test("regra soma e mínimo", () => {
  assert.equal(horasDoCertificado(1, 2, 4, "soma", 0), 4);
  assert.equal(horasDoCertificado(0, 2, 4, "soma", 0), null);
  assert.equal(horasDoCertificado(1, 2, 4, "minimo", 50), 4);
  assert.equal(horasDoCertificado(1, 3, 4, "minimo", 50), null);
});

test("palavra-chave ignora maiúsculas, espaços e acentos", () => {
  assert.equal(normalizarPalavra("  ciência "), normalizarPalavra("CIENCIA"));
  assert.notEqual(normalizarPalavra("JESS"), normalizarPalavra("JES"));
});

test("status da frequência", () => {
  const agora = new Date("2026-11-25T12:00:00Z");
  assert.equal(statusDaFrequencia({ desbloqueio_em: "2026-11-25T13:00:00Z", fechada: false }, agora), "programada");
  assert.equal(statusDaFrequencia({ desbloqueio_em: "2026-11-25T11:00:00Z", fechada: false }, agora), "aberta");
  assert.equal(statusDaFrequencia({ desbloqueio_em: "2026-11-25T11:00:00Z", fechada: true }, agora), "fechada");
});

test("fuso de Belém ida e volta", () => {
  const iso = localParaIso("2026-11-25T09:00");
  assert.equal(iso, "2026-11-25T12:00:00.000Z");
  assert.equal(isoParaLocal(iso), "2026-11-25T09:00");
});

test("campos do certificado", () => {
  assert.equal(preencher("Certificamos que {{nome}} fez {{ horas }}h. {{desconhecido}}", { nome: "Ana", horas: "8" }), "Certificamos que Ana fez 8h. {{desconhecido}}");
  assert.deepEqual([...camposUsados([{ texto: "{{nome}} {{codigo}}" } as never])], ["nome", "codigo"]);
});
