import { randomInt } from "crypto";

// Sem 0/O e 1/I/L para não confundir na digitação.
const ALFABETO = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export function gerarCodigo() {
  const bloco = () => Array.from({ length: 4 }, () => ALFABETO[randomInt(ALFABETO.length)]).join("");
  return `JES-${bloco()}-${bloco()}`;
}

export function normalizarCodigo(c: string) {
  return c.trim().toUpperCase().replace(/\s+/g, "");
}
