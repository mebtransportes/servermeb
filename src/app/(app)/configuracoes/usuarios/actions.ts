"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdminProfile } from "@/lib/auth-profile";
import {
  normalizeProfileRole,
  type ProfileRole,
} from "@/lib/roles";
import { revalidatePath } from "next/cache";

export type UsuarioListItem = {
  id: string;
  username: string;
  auth_email: string;
  role: ProfileRole;
  created_at: string;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

async function syncAuthBan(userId: string, role: ProfileRole) {
  const admin = createAdminClient();
  if (role === "inativo") {
    await admin.auth.admin.updateUserById(userId, {
      ban_duration: "876000h",
    });
  } else {
    await admin.auth.admin.updateUserById(userId, {
      ban_duration: "none",
    });
  }
}

export async function listarUsuarios(): Promise<{
  users: UsuarioListItem[];
  error?: string;
}> {
  try {
    await requireAdminProfile();
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("profiles")
      .select("id, username, auth_email, role, created_at")
      .order("created_at", { ascending: false });

    if (error) return { users: [], error: error.message };

    return {
      users: (data ?? []).map((row) => ({
        id: row.id,
        username: row.username,
        auth_email: row.auth_email,
        role: normalizeProfileRole(row.role),
        created_at: row.created_at,
      })),
    };
  } catch (e) {
    return { users: [], error: e instanceof Error ? e.message : "Erro ao listar." };
  }
}

export async function criarUsuario(payload: {
  email: string;
  username: string;
  password: string;
  role: ProfileRole;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireAdminProfile();
    const admin = createAdminClient();
    const email = normalizeEmail(payload.email);
    const username = normalizeUsername(payload.username);
    const role = normalizeProfileRole(payload.role);

    if (!email || !username || !payload.password || payload.password.length < 4) {
      return { ok: false, error: "Preencha e-mail, usuário e senha (mín. 4 caracteres)." };
    }

    const { data: existingUser } = await admin
      .from("profiles")
      .select("id")
      .eq("username", username)
      .maybeSingle();

    if (existingUser) {
      return { ok: false, error: "Nome de usuário já está em uso." };
    }

    const { data: existingEmail } = await admin
      .from("profiles")
      .select("id")
      .eq("auth_email", email)
      .maybeSingle();

    if (existingEmail) {
      return { ok: false, error: "E-mail já cadastrado." };
    }

    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password: payload.password,
      email_confirm: true,
      user_metadata: { role, username },
    });

    if (authError || !authData.user) {
      return { ok: false, error: authError?.message ?? "Erro ao criar usuário no Auth." };
    }

    const { error: profileError } = await admin.from("profiles").upsert({
      id: authData.user.id,
      username,
      auth_email: email,
      role,
    });

    if (profileError) {
      await admin.auth.admin.deleteUser(authData.user.id);
      return { ok: false, error: profileError.message };
    }

    await syncAuthBan(authData.user.id, role);
    revalidatePath("/configuracoes/usuarios");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro ao criar." };
  }
}

export async function atualizarUsuario(payload: {
  id: string;
  email: string;
  username: string;
  role: ProfileRole;
  password?: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    await requireAdminProfile();
    const admin = createAdminClient();
    const email = normalizeEmail(payload.email);
    const username = normalizeUsername(payload.username);
    const role = normalizeProfileRole(payload.role);

    if (!email || !username) {
      return { ok: false, error: "E-mail e usuário são obrigatórios." };
    }

    const { data: duplicateUser } = await admin
      .from("profiles")
      .select("id")
      .eq("username", username)
      .neq("id", payload.id)
      .maybeSingle();

    if (duplicateUser) {
      return { ok: false, error: "Nome de usuário já está em uso." };
    }

    const { data: duplicateEmail } = await admin
      .from("profiles")
      .select("id")
      .eq("auth_email", email)
      .neq("id", payload.id)
      .maybeSingle();

    if (duplicateEmail) {
      return { ok: false, error: "E-mail já cadastrado." };
    }

    const authUpdate: {
      email?: string;
      password?: string;
      user_metadata?: { role: string; username: string };
    } = {
      email,
      user_metadata: { role, username },
    };

    if (payload.password && payload.password.length >= 4) {
      authUpdate.password = payload.password;
    }

    const { error: authError } = await admin.auth.admin.updateUserById(
      payload.id,
      authUpdate
    );

    if (authError) {
      return { ok: false, error: authError.message };
    }

    const { error: profileError } = await admin
      .from("profiles")
      .update({ username, auth_email: email, role })
      .eq("id", payload.id);

    if (profileError) {
      return { ok: false, error: profileError.message };
    }

    await syncAuthBan(payload.id, role);
    revalidatePath("/configuracoes/usuarios");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erro ao atualizar." };
  }
}
