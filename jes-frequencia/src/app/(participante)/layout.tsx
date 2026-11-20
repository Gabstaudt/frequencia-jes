import Link from "next/link";
import { Logo } from "@/components/ui";
import { exigirUsuario } from "@/lib/auth";
import { sair } from "../(auth)/actions";
import { NavInferior } from "./nav";

export default async function ParticipanteLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await exigirUsuario();
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      <header className="flex items-center justify-between gap-3 px-6 pb-3 pt-5">
        <Logo />
        <div className="flex items-center gap-2">
          {profile.is_admin && (
            <Link href="/admin" className="btn-soft min-h-10 px-3 text-sm">
              Admin
            </Link>
          )}
          <form action={sair}>
            <button className="btn-secondary min-h-10 px-3 text-sm">Sair</button>
          </form>
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-5 px-6 pb-28 pt-2">{children}</main>
      <NavInferior />
    </div>
  );
}
