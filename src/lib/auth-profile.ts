import { createClient } from "@/lib/supabase/server";
import {
  isActiveProfileRole,
  normalizeProfileRole,
  type ProfileRole,
  type UserRole,
} from "@/lib/roles";

export type AppProfile = {
  username: string;
  role: UserRole;
  profileRole: ProfileRole;
};

export async function getAppProfile(userId: string): Promise<AppProfile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("username, role")
    .eq("id", userId)
    .single();

  if (error || !data) return null;

  const profileRole = normalizeProfileRole(data.role);
  if (!isActiveProfileRole(profileRole)) return null;

  return {
    username: data.username,
    role: profileRole,
    profileRole,
  };
}

export async function requireAdminProfile(): Promise<AppProfile> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Não autenticado.");

  const profile = await getAppProfile(user.id);
  if (!profile || profile.role !== "admin") {
    throw new Error("Apenas administradores podem executar esta ação.");
  }

  return profile;
}
