import JSZip from "jszip";
import { NextResponse } from "next/server";
import { getSessao } from "@/lib/auth";
import { baixarImagemModelo, pdfDoCertificado } from "@/lib/certificados";
import { buscarTodos } from "@/lib/dados";
import { getOrigin } from "@/lib/site";
import { createAdminClient } from "@/lib/supabase/server";
import type { Certificado } from "@/lib/types";

export const maxDuration = 60;

export async function GET() {
  const { profile } = await getSessao();
  if (!profile?.is_admin) return new NextResponse("Acesso restrito", { status: 403 });

  const db = createAdminClient();
  const certs = await buscarTodos<Certificado>((de, ate) => db.from("certificados").select("*").eq("invalidado", false).order("tipo").order("nome").range(de, ate));
  const origin = await getOrigin();
  const cache = new Map<string, Awaited<ReturnType<typeof baixarImagemModelo>>>();
  const zip = new JSZip();
  const usados = new Set<string>();

  for (const c of certs) {
    const bytes = await pdfDoCertificado(c, origin, cache);
    const base = `${c.tipo}/${c.nome}`.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9/]+/g, "-");
    let nome = `${base}.pdf`;
    for (let i = 2; usados.has(nome); i++) nome = `${base}-${i}.pdf`;
    usados.add(nome);
    zip.file(nome, bytes);
  }

  const conteudo = await zip.generateAsync({ type: "uint8array" });
  return new NextResponse(Buffer.from(conteudo), {
    headers: { "Content-Type": "application/zip", "Content-Disposition": 'attachment; filename="certificados-jes.zip"' },
  });
}
