import { AuthShell, Voltar } from "@/components/ui";
import { EsqueciForm } from "../forms";

export const metadata = { title: "Recuperar senha · Frequência JES" };

export default function EsqueciPage() {
  return (
    <AuthShell>
      <Voltar href="/entrar">Entrar</Voltar>
      <div className="flex flex-col gap-1">
        <h1 className="h1">Recuperar senha</h1>
        <p className="text-muted">Informe o e-mail da sua conta. Enviaremos um link para criar uma nova senha.</p>
      </div>
      <EsqueciForm />
    </AuthShell>
  );
}
