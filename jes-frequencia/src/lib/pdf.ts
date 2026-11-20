import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import QRCode from "qrcode";
import type { BlocoQr, BlocoTexto } from "./types";
import { preencher, tamanhoPagina, type DadosCertificado } from "./campos";
export { CAMPOS, preencher, tamanhoPagina, camposUsados, type DadosCertificado } from "./campos";

function hexParaRgb(hex: string) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h.padEnd(6, "0"), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

/** As fontes padrão do PDF só têm caracteres latinos (WinAnsi). Troca o que não couber. */
function sanitizar(font: PDFFont, texto: string) {
  let out = "";
  for (const ch of texto
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—−]/g, "-")
    .replace(/\r/g, "")) {
    if (ch === "\n") {
      out += ch;
      continue;
    }
    try {
      font.encodeText(ch);
      out += ch;
    } catch {
      out += "?";
    }
  }
  return out;
}

function quebrarLinhas(font: PDFFont, texto: string, tamanho: number, largura: number) {
  const linhas: string[] = [];
  for (const paragrafo of texto.split("\n")) {
    const palavras = paragrafo.split(/\s+/).filter(Boolean);
    if (palavras.length === 0) {
      linhas.push("");
      continue;
    }
    let atual = "";
    for (const p of palavras) {
      const tentativa = atual ? `${atual} ${p}` : p;
      if (font.widthOfTextAtSize(tentativa, tamanho) <= largura || !atual) atual = tentativa;
      else {
        linhas.push(atual);
        atual = p;
      }
    }
    linhas.push(atual);
  }
  return linhas;
}

export type EntradaPdf = {
  imagem?: { bytes: Uint8Array; tipo: "png" | "jpg"; largura: number; altura: number } | null;
  blocos: BlocoTexto[];
  qr: BlocoQr;
  dados: DadosCertificado;
  urlValidacao: string;
};

async function desenharPagina(doc: PDFDocument, e: EntradaPdf, cache: Map<string, unknown>) {
  const { w, h } = tamanhoPagina(e.imagem?.largura, e.imagem?.altura);
  const page = doc.addPage([w, h]);

  if (e.imagem) {
    let img = cache.get("img") as Awaited<ReturnType<PDFDocument["embedPng"]>> | undefined;
    if (!img) {
      img = e.imagem.tipo === "png" ? await doc.embedPng(e.imagem.bytes) : await doc.embedJpg(e.imagem.bytes);
      cache.set("img", img);
    }
    page.drawImage(img, { x: 0, y: 0, width: w, height: h });
  } else {
    // Sem arte: moldura simples.
    page.drawRectangle({ x: 18, y: 18, width: w - 36, height: h - 36, borderColor: rgb(0.137, 0.255, 0.722), borderWidth: 3 });
  }

  const fontes: Record<string, StandardFonts> = {
    "helvetica-0": StandardFonts.Helvetica,
    "helvetica-1": StandardFonts.HelveticaBold,
    "times-0": StandardFonts.TimesRoman,
    "times-1": StandardFonts.TimesRomanBold,
    "courier-0": StandardFonts.Courier,
    "courier-1": StandardFonts.CourierBold,
  };

  for (const b of e.blocos) {
    const chave = `${b.fonte}-${b.negrito ? 1 : 0}`;
    let font = cache.get(chave) as PDFFont | undefined;
    if (!font) {
      font = await doc.embedFont(fontes[chave] ?? StandardFonts.Helvetica);
      cache.set(chave, font);
    }
    const texto = sanitizar(font, preencher(b.texto, e.dados));
    const largura = (b.largura / 100) * w;
    const x0 = (b.x / 100) * w;
    const topo = h - (b.y / 100) * h;
    const altLinha = b.tamanho * 1.3;
    const linhas = quebrarLinhas(font, texto, b.tamanho, largura);
    const cor = hexParaRgb(b.cor || "#151922");
    linhas.forEach((linha, i) => {
      const lw = font!.widthOfTextAtSize(linha, b.tamanho);
      const x = b.alinhamento === "centro" ? x0 + (largura - lw) / 2 : b.alinhamento === "direita" ? x0 + largura - lw : x0;
      const y = topo - b.tamanho * 0.95 - i * altLinha;
      page.drawText(linha, { x, y, size: b.tamanho, font, color: cor });
    });
  }

  if (e.qr?.ativo) {
    const lado = (e.qr.tamanho / 100) * w;
    let png = cache.get(`qr-${e.urlValidacao}`) as Awaited<ReturnType<PDFDocument["embedPng"]>> | undefined;
    if (!png) {
      const buf = await QRCode.toBuffer(e.urlValidacao, { type: "png", margin: 1, width: 600, errorCorrectionLevel: "M" });
      png = await doc.embedPng(new Uint8Array(buf));
    }
    page.drawImage(png, { x: (e.qr.x / 100) * w, y: h - (e.qr.y / 100) * h - lado, width: lado, height: lado });
  }
}

export async function gerarPdf(e: EntradaPdf) {
  const doc = await PDFDocument.create();
  doc.setTitle(`Certificado ${e.dados.tipo} - ${e.dados.nome}`);
  doc.setSubject(`Código de validação ${e.dados.codigo}`);
  await desenharPagina(doc, e, new Map());
  return doc.save();
}

/** Lê largura e altura de um PNG ou JPG usando o próprio pdf-lib. */
export async function dimensoesImagem(bytes: Uint8Array, tipo: "png" | "jpg") {
  const doc = await PDFDocument.create();
  const img = tipo === "png" ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
  return { largura: img.width, altura: img.height };
}
