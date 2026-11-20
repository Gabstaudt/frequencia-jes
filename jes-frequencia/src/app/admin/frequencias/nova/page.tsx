import { Voltar } from "@/components/ui";
import { isoParaLocal } from "@/lib/frequencia";
import { createAdminClient } from "@/lib/supabase/server";
import { FrequenciaForm } from "../form";

export const metadata = { title: "Nova frequência · Admin JES" };

export default async function NovaFrequenciaPage() {
  // Sugere o próximo dia/marcação a partir do que já existe.
  const db = createAdminClient();
  const { data: ultima } = await db.from("frequencias").select("dia,marcacao").order("dia", { ascending: false }).order("marcacao", { ascending: false }).limit(1).maybeSingle();
  const dia = ultima ? (ultima.marcacao >= 2 ? ultima.dia + 1 : ultima.dia) : 1;
  const marcacao = ultima ? (ultima.marcacao >= 2 ? 1 : ultima.marcacao + 1) : 1;
  const agora = isoParaLocal(new Date().toISOString());

  return (
    <>
      <Voltar href="/admin/frequencias">Frequências</Voltar>
      <h1 className="h1">Nova frequência</h1>
      <div className="flex flex-wrap items-start gap-5">
        <section className="card min-w-0 flex-[999_1_320px] p-5 md:p-6">
          <FrequenciaForm modo="criar" inicial={{ nome: "", dia, marcacao, palavra_chave: "", data: agora.slice(0, 10), hora: marcacao === 1 ? "09:00" : "14:00" }} />
        </section>
        <aside className="card flex flex-[1_1_260px] flex-col gap-3 p-5">
          <span className="eyebrow">Como funciona para o participante</span>
          <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm leading-relaxed text-body">
            <li>Antes do horário, a frequência aparece como bloqueada.</li>
            <li>No horário de desbloqueio, abre sozinha.</li>
            <li>Você anuncia a palavra-chave na palestra e manda o link.</li>
            <li>A pessoa entra, digita a palavra e a presença é registrada.</li>
          </ol>
          <span className="text-[13px] text-muted">Depois de criar, você vê o link direto para compartilhar.</span>
        </aside>
      </div>
    </>
  );
}
