import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { caminhoSeguro } from "@/lib/auth";

/**
 * Destino dos links de e-mail (confirmação de cadastro e recuperação de senha).
 * Aceita os dois formatos do Supabase: token_hash (recomendado, funciona em
 * qualquer aparelho) e code (PKCE, precisa ser o mesmo navegador do cadastro).
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const code = url.searchParams.get("code");
  const next = caminhoSeguro(url.searchParams.get("next"));

  const supabase = await createClient();
  let ok = false;
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    ok = !error;
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    ok = !error;
  }

  const destino = url.clone();
  destino.search = "";
  if (ok) {
    destino.pathname = type === "recovery" ? "/redefinir-senha" : next;
    if (destino.pathname.includes("?")) {
      const [p, q] = destino.pathname.split("?");
      destino.pathname = p;
      destino.search = q;
    }
  } else {
    destino.pathname = "/entrar";
    destino.searchParams.set("erro", "link");
    destino.searchParams.set("next", next);
  }
  return NextResponse.redirect(destino);
}
