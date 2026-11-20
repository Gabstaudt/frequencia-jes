import { NextResponse, type NextRequest } from "next/server";
import { getSessao } from "@/lib/auth";
import { baixarImagemModelo, calcularDestinatarios, dadosDoCertificado } from "@/lib/certificados";
import { gerarPdf } from "@/lib/pdf";
import { getOrigin } from "@/lib/site";
import { createAdminClient } from "@/lib/supabase/server";
import type { ModeloCertificado } from "@/lib/types";

/** PDF de teste do modelo salvo, preenchido com uma pessoa de exemplo. */
export async function GET(request: NextRequest) {
  const { profile } = await getSessao();
  if (!profile?.is_admin) return new NextResponse("Acesso restrito", { status: 403 });

  const tipo = request.nextUrl.searchParams.get("tipo") ?? "Participante";
  const db = createAdminClient();
  const { data: m } = await db.from("modelos_certificado").select("*").eq("tipo", tipo).maybeSingle<ModeloCertificado>();
  if (!m) return new NextResponse("Modelo não encontrado", { status: 404 });

  const { config, destinatarios } = await calcularDestinatarios();
  const ex = destinatarios.find((d) => d.tipo === tipo);
  const origin = await getOrigin();
  const codigo = "JES-TEST-E000";
  const bytes = await gerarPdf({
    imagem: await baixarImagemModelo(m),
    blocos: m.blocos,
    qr: m.qr,
    dados: dadosDoCertificado({ nome: ex?.nome ?? "Nome Completo da Pessoa", horas: ex?.horas ?? 8, tipo, codigo, emitido_em: new Date().toISOString() }, config, origin),
    urlValidacao: `${origin}/validar/${codigo}`,
  });
  return new NextResponse(Buffer.from(bytes), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": 'inline; filename="teste-certificado.pdf"', "Cache-Control": "no-store" },
  });
}
