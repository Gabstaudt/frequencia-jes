import Link from "next/link";
import { AuthShell } from "@/components/ui";

export default function NaoEncontrado() {
  return (
    <AuthShell>
      <h1 className="h1">Página não encontrada</h1>
      <p className="text-body">O link pode estar errado ou a frequência foi removida.</p>
      <Link href="/" className="btn-primary">
        Ir para o início
      </Link>
    </AuthShell>
  );
}
