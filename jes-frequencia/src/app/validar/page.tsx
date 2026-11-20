import { redirect } from "next/navigation";
import { AuthShell } from "@/components/ui";
import { normalizarCodigo } from "@/lib/codigo";

export const metadata = { title: "Validar certificado · JES" };

async function verificar(fd: FormData) {
  "use server";
  const codigo = normalizarCodigo(String(fd.get("codigo") ?? ""));
  if (codigo) redirect(`/validar/${encodeURIComponent(codigo)}`);
}

export default function ValidarPage() {
  return (
    <AuthShell>
      <div className="flex flex-col gap-1">
        <h1 className="h1">Validação de certificado</h1>
        <p className="leading-relaxed text-muted">Digite o código impresso no certificado ou leia o QR code. Não precisa de login.</p>
      </div>
      <form action={verificar} className="flex flex-col gap-4">
        <label className="label">
          Código do certificado
          <input name="codigo" required placeholder="JES-XXXX-XXXX" autoCapitalize="characters" spellCheck={false} className="input h-13 font-mono text-base tracking-wide" />
        </label>
        <button className="btn-primary h-13 text-base">Verificar</button>
      </form>
    </AuthShell>
  );
}
