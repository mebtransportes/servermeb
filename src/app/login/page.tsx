"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff, Lock, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/brand/logo";
import {
  isActiveProfileRole,
  normalizeProfileRole,
} from "@/lib/roles";
import { cn } from "@/lib/utils";

const supabaseConfigured =
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

function LoginPageContent() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
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

    window.location.href = "/";
  }

  return (
    <div className="relative flex h-dvh max-h-dvh flex-col items-center justify-center overflow-hidden bg-[#0b0d1a] px-4 py-4">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[18%] h-[28rem] w-[28rem] -translate-x-1/2 rounded-full bg-[#33388d]/35 blur-[100px]" />
        <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-sky-600/10 blur-[80px]" />
        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.12) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
          }}
        />
      </div>

      <div className="login-panel relative z-10 flex w-full max-w-[24rem] flex-col items-center">
        <div className="mb-4 flex w-full justify-center">
          <Logo variant="login" />
        </div>

        <div className="w-full rounded-2xl border border-white/10 bg-[#12152a]/85 p-5 shadow-2xl shadow-black/40 backdrop-blur-md sm:p-6">
          <div className="mb-5 text-center">
            <h1 className="text-lg font-semibold text-white">Bem-vindo(a)</h1>
            <p className="mt-1 text-sm text-white/55">
              Acesse o painel com seu usuário e senha.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="space-y-1.5">
              <label
                htmlFor="login-username"
                className="text-[11px] font-semibold uppercase tracking-wide text-white/50"
              >
                Usuário ou e-mail
              </label>
              <div className="relative">
                <UserRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                <input
                  id="login-username"
                  name="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                  placeholder="admin ou admin@meb.local"
                  className="w-full rounded-xl border border-white/10 bg-[#0b0d1a] py-2.5 pl-10 pr-3 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-[#33388d] focus:ring-2 focus:ring-[#33388d]/40"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="login-password"
                className="text-[11px] font-semibold uppercase tracking-wide text-white/50"
              >
                Senha
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  placeholder="••••••"
                  className="w-full rounded-xl border border-white/10 bg-[#0b0d1a] py-2.5 pl-10 pr-10 text-sm text-white placeholder:text-white/30 outline-none transition focus:border-[#33388d] focus:ring-2 focus:ring-[#33388d]/40"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 transition hover:text-white/70"
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2.5 text-sm text-red-200">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !supabaseConfigured}
              className={cn(
                "mt-1 w-full rounded-xl bg-[#33388d] py-2.5 text-sm font-semibold text-white transition",
                "shadow-[0_0_24px_rgba(51,56,141,0.45)] hover:bg-[#3d43a0]",
                "disabled:cursor-not-allowed disabled:opacity-50"
              )}
            >
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>
        </div>

        <p className="mt-5 text-center text-[11px] text-white/35">
          M&B — Gestão de Transporte
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#0b0d1a] text-white/60">
          Carregando...
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
