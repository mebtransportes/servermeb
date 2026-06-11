import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAppProfile } from "@/lib/auth-profile";
import { Sidebar } from "@/components/layout/sidebar";
import { RoleGuard } from "@/components/layout/role-guard";
import { AppProviders } from "@/components/providers/app-providers";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const profile = await getAppProfile(user.id);
  if (!profile) redirect("/login");

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar username={profile.username} role={profile.role} />
      <main className="meb-app-main flex-1 overflow-auto p-6 text-base lg:p-8">
        <AppProviders>
          <RoleGuard role={profile.role}>{children}</RoleGuard>
        </AppProviders>
      </main>
    </div>
  );
}
