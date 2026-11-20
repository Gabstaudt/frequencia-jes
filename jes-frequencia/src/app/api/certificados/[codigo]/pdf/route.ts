import { NextResponse, type NextRequest } from "next/server";
import { getSessao } from "@/lib/auth";
import { pdfDoCertificado } from "@/lib/certificados";
import { normalizarCodigo } from "@/lib/codigo";
import { getConfig } from "@/lib/dados";
import { getOrigin } from "@/lib/site";
import { createAdminClient } from "@/lib/supabase/server";
import type { Certificado } from "@/lib/types";

export async function GET(_: NextRequest, { params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const { user, profile } = await getSessao();
  if (!user) return new NextResponse("Entre na sua conta para baixar o certificado.", { status: 401 });

  const db = createAdminClient();
  const { data: c } = await db.from("certificados").select("*").eq("codigo", normalizarCodigo(codigo)).maybeSingle<Certificado>();
  if (!c) return new NextResponse("Certificado não encontrado.", { status: 404 });

  const admin = !!profile?.is_admin;
  const dono = c.user_id === user.id || c.email.toLowerCase() === (user.email ?? "").toLowerCase();
  if (!admin) {
    if (!dono) return new NextResponse("Este certificado não é seu.", { status: 403 });
    const config = await getConfig();
    if (!config.certificados_liberados) return new NextResponse("Os certificados ainda não foram liberados.", { status: 403 });
    if (c.invalidado) return new NextResponse("Este certificado foi invalidado.", { status: 410 });
  }

  const bytes = await pdfDoCertificado(c, await getOrigin());
  const nomeArquivo = `certificado-${c.tipo}-${c.nome}`.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").toLowerCase();
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${nomeArquivo}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
