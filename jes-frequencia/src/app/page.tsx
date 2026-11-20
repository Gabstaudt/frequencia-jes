import { redirect } from "next/navigation";
import { getSessao } from "@/lib/auth";

export default async function Home() {
  const { user, profile } = await getSessao();
  if (!user) redirect("/entrar");
  redirect(profile?.is_admin ? "/admin" : "/inicio");
}
