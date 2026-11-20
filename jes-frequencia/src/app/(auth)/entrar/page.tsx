import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/ui";
import { caminhoSeguro, getSessao } from "@/lib/auth";
import { LoginForm } from "../forms";

export const metadata = { title: "Entrar · Frequência JES" };

export default async function EntrarPage({ searchParams }: { searchParams: Promise<{ next?: string; erro?: string }> }) {
  const sp = await searchParams;
  const next = caminhoSeguro(sp.next);
  const { user } = await getSessao();
  if (user) redirect(next);
  const vindoDeFrequencia = next.startsWith("/f/");

  return (
    <AuthShell>
      <div className="flex flex-col gap-1">
        <h1 className="h1">Entrar</h1>
        <p className="text-muted">Registre sua presença nas palestras do JES.</p>
      </div>
      {vindoDeFrequencia && <p className="alert-info">Depois de entrar, você volta direto para a frequência que abriu.</p>}
      {sp.erro === "link" && (
        <p className="alert-error">Esse link expirou ou já foi usado. Entre normalmente ou peça um novo.</p>
      )}
      <LoginForm next={next} />
      <p className="flex flex-wrap items-center justify-center gap-1.5 text-sm text-muted">
        Ainda não tem conta?
        <Link href={`/cadastro?next=${encodeURIComponent(next)}`} className="btn-link">
          Criar conta
        </Link>
      </p>
    </AuthShell>
  );
}
