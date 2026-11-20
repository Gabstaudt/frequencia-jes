import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/ui";
import { caminhoSeguro, getSessao } from "@/lib/auth";
import { CadastroForm } from "../forms";

export const metadata = { title: "Criar conta · Frequência JES" };

export default async function CadastroPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const sp = await searchParams;
  const next = caminhoSeguro(sp.next);
  const { user } = await getSessao();
  if (user) redirect(next);

  return (
    <AuthShell>
      <Link href={`/entrar?next=${encodeURIComponent(next)}`} className="btn-link self-start">
        ← Já tenho conta
      </Link>
      <div className="flex flex-col gap-1">
        <h1 className="h1">Criar conta</h1>
        <p className="text-muted">Você faz isso uma vez só. Depois é só entrar e marcar presença.</p>
      </div>
      <CadastroForm next={next} />
    </AuthShell>
  );
}
