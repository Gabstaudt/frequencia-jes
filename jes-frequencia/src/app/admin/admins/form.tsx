"use client";

import { useActionState } from "react";
import { BotaoEnviar, Mensagem } from "@/components/admin-ui";
import { adicionarAdmin, type AdminState } from "../actions";

export function AdicionarAdminForm() {
  const [estado, acao] = useActionState<AdminState, FormData>(adicionarAdmin, {});
  return (
    <form action={acao} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="label flex-[1_1_240px]">
          E-mail do novo admin
          <input className="input" type="email" name="email" required placeholder="pessoa@email.com" />
        </label>
        <BotaoEnviar className="btn-primary h-12">Adicionar admin</BotaoEnviar>
      </div>
      <p className="text-[13px] text-muted">A pessoa precisa ter criado a conta no site antes.</p>
      <Mensagem erro={estado.erro} ok={estado.ok} />
    </form>
  );
}
