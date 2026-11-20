import { BotaoConfirmar } from "@/components/admin-ui";
import { exigirAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { removerAdmin } from "../actions";
import { AdicionarAdminForm } from "./form";

export const metadata = { title: "Admins · Admin JES" };

export default async function AdminsPage() {
  const { profile: eu } = await exigirAdmin();
  const db = createAdminClient();
  const { data: admins } = await db.from("profiles").select("id,nome,email,is_master").eq("is_admin", true).order("is_master", { ascending: false }).order("nome");

  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="h1">Admins</h1>
        <p className="text-muted">Todos os admins têm todas as permissões. Só a admin master adiciona ou remove admins.</p>
      </div>
      {eu.is_master && (
        <section className="card p-5">
          <AdicionarAdminForm />
        </section>
      )}
      <section className="card overflow-hidden">
        {(admins ?? []).map((a) => (
          <div key={a.id} className="flex flex-wrap items-center justify-between gap-2.5 border-t border-[#eef0f3] px-4 py-3.5 first:border-t-0">
            <div className="flex flex-col">
              <span className="font-semibold">{a.nome}</span>
              <span className="text-xs text-muted">{a.email}</span>
            </div>
            <div className="flex items-center gap-2.5">
              {a.is_master ? <span className="badge bg-ink text-white">Admin master</span> : <span className="badge-info">Admin</span>}
              {eu.is_master && a.id !== eu.id && (
                <form action={removerAdmin}>
                  <input type="hidden" name="id" value={a.id} />
                  <BotaoConfirmar mensagem={`Remover ${a.nome} dos admins?`} className="btn-danger min-h-10 px-3 text-sm">
                    Remover
                  </BotaoConfirmar>
                </form>
              )}
            </div>
          </div>
        ))}
      </section>
    </>
  );
}
