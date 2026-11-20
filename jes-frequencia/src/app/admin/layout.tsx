import { exigirAdmin } from "@/lib/auth";
import { NavAdmin } from "./nav";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await exigirAdmin();
  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <NavAdmin nome={profile.nome} master={profile.is_master} />
      <main className="flex min-w-0 flex-1 flex-col gap-6 p-4 pb-16 md:p-8">{children}</main>
    </div>
  );
}
