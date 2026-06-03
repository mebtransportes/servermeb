"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import {
  getDefaultHome,
  isActiveProfileRole,
  normalizeProfileRole,
  normalizeRole,
} from "@/lib/roles";

const supabaseConfigured =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

function LoginPageContent() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("error") === "config" || !supabaseConfigured) {
      setError(
        "Supabase não configurado no servidor. Na Vercel, adicione NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY nas variáveis de ambiente e faça um novo deploy."
      );
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const input = username.trim().toLowerCase();
    let authEmail: string | null = null;
    let profileRole: string | null = null;

    // Aceita e-mail ou nome de usuário
    if (input.includes("@")) {
      const { data: profileByEmail, error: emailLookupError } = await supabase
        .from("profiles")
        .select("auth_email, role")
        .eq("auth_email", input)
        .maybeSingle();

      if (emailLookupError) {
        setError("Erro ao buscar usuário. Tente novamente.");
        setLoading(false);
        return;
      }

      if (!profileByEmail) {
        setError("Usuário não encontrado para este e-mail.");
        setLoading(false);
        return;
      }

      authEmail = profileByEmail.auth_email;
      profileRole = profileByEmail.role;
    } else {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("auth_email, role")
        .eq("username", input)
        .maybeSingle();

      if (profileError) {
        console.error(profileError);
        setError(
          profileError.message.includes("profiles")
            ? "Tabela profiles não encontrada. Execute a migration SQL no Supabase."
            : "Erro ao buscar usuário. Tente novamente."
        );
        setLoading(false);
        return;
      }

      if (profile) {
        authEmail = profile.auth_email;
        profileRole = profile.role;
      }
    }

    if (!authEmail) {
      setError(
        'Usuário não encontrado. Digite "admin" ou "admin@meb.local" e confira se rodou o SQL de profiles no Supabase.'
      );
      setLoading(false);
      return;
    }

    const role = normalizeProfileRole(profileRole);
    if (!isActiveProfileRole(role)) {
      setError("Esta conta está inativa. Entre em contato com o administrador.");
      setLoading(false);
      return;
    }

    const { error: authError } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password,
    });

    setLoading(false);

    if (authError) {
      if (authError.message.includes("Invalid login credentials")) {
        setError("Senha incorreta. A senha padrão é 123 (se não foi alterada).");
      } else if (authError.message.includes("Email not confirmed")) {
        setError("E-mail não confirmado. No Supabase, marque o usuário como confirmado.");
      } else {
        setError(authError.message);
      }
      return;
    }

    const {
      data: { user: sessionUser },
    } = await supabase.auth.getUser();

    const { data: profileAfter } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", sessionUser?.id ?? "")
      .maybeSingle();

    const roleAfter = normalizeProfileRole(profileAfter?.role);
    if (!isActiveProfileRole(roleAfter)) {
      await supabase.auth.signOut();
      setError("Esta conta está inativa. Entre em contato com o administrador.");
      return;
    }

    router.push(getDefaultHome(normalizeRole(roleAfter)));
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#121212] p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-300/80 bg-[#e8edf2] p-8 shadow-xl">
        <div className="mb-8 flex flex-col items-center gap-4">
          <Logo variant="login" />
          <p className="text-center text-sm text-slate-600">
            Gestão de transporte — acesse com seu usuário
          </p>
        </div>

        <form onSubmit={handleSubmit} className="login-form-light space-y-4">
          <Input
            tone="light"
            label="Usuário ou e-mail"
            name="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
            placeholder="admin ou admin@meb.local"
          />
          <Input
            tone="light"
            label="Senha"
            name="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            placeholder="••••••"
          />
          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          <Button
            type="submit"
            className="w-full"
            disabled={loading || !supabaseConfigured}
          >
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageContent />
    </Suspense>
  );
}
