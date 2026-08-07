import { redirect } from "next/navigation";
import { Settings2 } from "lucide-react";
import { getAppProfile } from "@/lib/auth-profile";
import { createClient } from "@/lib/supabase/server";
import { GerenciamentoPanel } from "@/components/configuracoes/gerenciamento-panel";

export default async function ConfiguracoesGerenciamentoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profile = await getAppProfile(user.id);
  if (!profile || profile.role !== "admin") {
    redirect("/dashboard");
  }

  return (
    <div>
      <header className="mb-6 flex items-center gap-3">
        <Settings2 className="h-8 w-8 text-[#33388d]" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gerenciamento</h1>
          <p className="text-slate-500">
            Domínio, uso do Supabase e documentos protegidos por senha
          </p>
        </div>
      </header>
      <GerenciamentoPanel />
    </div>
  );
}
