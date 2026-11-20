import { mudarStatusFrequencia } from "../actions";
import { BotaoEnviar } from "@/components/admin-ui";
import type { StatusFrequencia } from "@/lib/frequencia";

export function BadgeStatus({ status }: { status: StatusFrequencia }) {
  if (status === "aberta") return <span className="badge-ok">Aberta</span>;
  if (status === "fechada") return <span className="badge-neutral">Fechada</span>;
  return <span className="badge-warn">Programada</span>;
}

export function BotaoStatus({ id, status, className = "btn-secondary min-h-10 px-3 text-sm" }: { id: string; status: StatusFrequencia; className?: string }) {
  const acao = status === "aberta" ? "fechar" : status === "fechada" ? "reabrir" : "abrir_agora";
  const label = status === "aberta" ? "Fechar" : status === "fechada" ? "Reabrir" : "Abrir agora";
  return (
    <form action={mudarStatusFrequencia}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="acao" value={acao} />
      <BotaoEnviar className={className}>{label}</BotaoEnviar>
    </form>
  );
}
