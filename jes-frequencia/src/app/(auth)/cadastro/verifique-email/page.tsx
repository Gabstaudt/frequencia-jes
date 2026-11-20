import Link from "next/link";
import { AuthShell, Icone } from "@/components/ui";
import { caminhoSeguro } from "@/lib/auth";
import { ReenviarForm } from "../../forms";

export const metadata = { title: "Confirme seu e-mail · Frequência JES" };

export default async function VerifiquePage({ searchParams }: { searchParams: Promise<{ email?: string; next?: string }> }) {
  const sp = await searchParams;
  const email = sp.email ?? "";
  const next = caminhoSeguro(sp.next);
  return (
    <AuthShell>
      <div className="flex flex-col items-center gap-4 pt-6 text-center">
        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-soft text-primary">
          <Icone nome="email" className="h-9 w-9" />
        </span>
        <h1 className="h1">Confirme seu e-mail</h1>
        <p className="leading-relaxed text-body">
          Enviamos um link de confirmação para <strong className="break-all">{email || "o seu e-mail"}</strong>. A conta só fica ativa
          depois que você clicar nele. Confira também a caixa de spam.
        </p>
        {next.startsWith("/f/") && <p className="alert-info">Ao confirmar, você volta direto para a frequência que abriu.</p>}
      </div>
      {email && <ReenviarForm email={email} next={next} />}
      <Link href={`/entrar?next=${encodeURIComponent(next)}`} className="btn-primary h-13 text-base">
        Já confirmei, entrar
      </Link>
    </AuthShell>
  );
}
