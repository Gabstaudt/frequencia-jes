import { NextResponse, type NextRequest } from "next/server";
import { getSessao } from "@/lib/auth";
import { buscarTodos, todasPresencas, todosPerfis } from "@/lib/dados";
import { formatarData, formatarDataHora } from "@/lib/frequencia";
import { createAdminClient } from "@/lib/supabase/server";
import type { Certificado } from "@/lib/types";

function csv(linhas: (string | number | null | undefined)[][]) {
  const esc = (v: string | number | null | undefined) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  // BOM + ponto e vírgula: abre certo no Excel em português.
  return "﻿" + linhas.map((l) => l.map(esc).join(";")).join("\r\n");
}

export async function GET(request: NextRequest) {
  const { profile } = await getSessao();
  if (!profile?.is_admin) return new NextResponse("Acesso restrito", { status: 403 });

  const tipo = request.nextUrl.searchParams.get("tipo") ?? "presencas";
  const db = createAdminClient();
  const perfis = await todosPerfis();
  const pMap = new Map(perfis.map((p) => [p.id, p]));
  let linhas: (string | number | null | undefined)[][] = [];

  if (tipo === "participantes") {
    linhas = [["Nome", "E-mail", "Data de nascimento", "Estuda", "Universidade", "Estado", "Admin"]];
    for (const p of perfis) {
      linhas.push([p.nome, p.email, p.data_nascimento ? formatarData(p.data_nascimento + "T12:00:00Z") : "", p.estuda ? "Sim" : "Não", p.universidade, p.estado, p.is_admin ? "Sim" : "Não"]);
    }
  } else if (tipo === "certificados") {
    const certs = await buscarTodos<Certificado>((de, ate) => db.from("certificados").select("*").order("tipo").order("nome").range(de, ate));
    linhas = [["Nome", "E-mail", "Tipo", "Horas", "Código", "Emitido em", "Situação"]];
    for (const c of certs) linhas.push([c.nome, c.email, c.tipo, Number(c.horas), c.codigo, formatarDataHora(c.emitido_em), c.invalidado ? "Invalidado" : "Válido"]);
  } else {
    const { data: fs } = await db.from("frequencias").select("id,nome,dia,marcacao");
    const fMap = new Map((fs ?? []).map((f) => [f.id, f]));
    const pres = await todasPresencas();
    linhas = [["Frequência", "Dia", "Marcação", "Nome", "E-mail", "Universidade", "Estado", "Data e hora", "Origem", "Marcado por"]];
    for (const p of pres) {
      const f = fMap.get(p.frequencia_id);
      const u = pMap.get(p.user_id);
      linhas.push([
        f?.nome, f?.dia, f?.marcacao, u?.nome, u?.email, u?.universidade, u?.estado,
        formatarDataHora(p.created_at), p.origem === "manual" ? "Manual" : "Palavra-chave",
        p.marcado_por ? pMap.get(p.marcado_por)?.nome : "",
      ]);
    }
  }

  return new NextResponse(csv(linhas), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="jes-${tipo}.csv"`,
    },
  });
}
