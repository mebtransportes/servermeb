import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/app-shell";
import { getAppProfile } from "@/lib/auth-profile";

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
    <AppShell username={profile.username} role={profile.role}>
      {children}
    </AppShell>
  );
}
