import "server-only";
import { redirect } from "next/navigation";
import { createAdminClient, createClient } from "./supabase/server";
import type { Profile } from "./types";

export async function getSessao() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null };
  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("*").eq("id", user.id).maybeSingle<Profile>();
  return { user, profile };
}

export async function exigirUsuario(next = "/inicio") {
  const s = await getSessao();
  if (!s.user || !s.profile) redirect(`/entrar?next=${encodeURIComponent(next)}`);
  return { user: s.user, profile: s.profile };
}

export async function exigirAdmin() {
  const s = await getSessao();
  if (!s.user || !s.profile) redirect("/entrar?next=/admin");
  if (!s.profile.is_admin) redirect("/inicio");
  return { user: s.user, profile: s.profile };
}

/** Para server actions: lança erro em vez de redirecionar. */
export async function garantirAdmin() {
  const s = await getSessao();
  if (!s.profile?.is_admin) throw new Error("Acesso restrito aos admins.");
  return s.profile;
}

/** Só aceita caminhos internos, para não virar redirecionamento aberto. */
export function caminhoSeguro(next: string | null | undefined, padrao = "/inicio") {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return padrao;
  return next;
}
