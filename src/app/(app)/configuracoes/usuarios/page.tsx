import { redirect } from "next/navigation";
import { getAppProfile } from "@/lib/auth-profile";
import { createClient } from "@/lib/supabase/server";
import { UsuariosAdminPanel } from "@/components/configuracoes/usuarios-admin-panel";

export default async function ConfiguracoesUsuariosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profile = await getAppProfile(user.id);
  if (!profile || profile.role !== "admin") {
    redirect("/dashboard");
  }

  return <UsuariosAdminPanel />;
}
