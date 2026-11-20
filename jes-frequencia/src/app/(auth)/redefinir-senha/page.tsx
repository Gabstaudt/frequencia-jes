import { AuthShell } from "@/components/ui";
import { exigirUsuario } from "@/lib/auth";
import { RedefinirForm } from "../forms";

export const metadata = { title: "Nova senha · Frequência JES" };

export default async function RedefinirPage() {
  await exigirUsuario("/redefinir-senha");
  return (
    <AuthShell>
      <div className="flex flex-col gap-1">
        <h1 className="h1">Criar nova senha</h1>
        <p className="text-muted">Escolha uma senha com pelo menos 8 caracteres.</p>
      </div>
      <RedefinirForm />
    </AuthShell>
  );
}
