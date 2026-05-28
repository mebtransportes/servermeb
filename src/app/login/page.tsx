"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/brand/logo";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const supabase = createClient();
    const input = username.trim().toLowerCase();
    let authEmail: string | null = null;

    // Aceita e-mail (admin@meb.local) ou nome de usuário (admin)
    if (input.includes("@")) {
      authEmail = input;
    } else {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("auth_email")
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
      }
    }

    if (!authEmail) {
      setError(
        'Usuário não encontrado. Digite "admin" ou "admin@meb.local" e confira se rodou o SQL de profiles no Supabase.'
      );
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

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-700/50 bg-slate-900/80 p-8 shadow-2xl backdrop-blur">
        <div className="mb-8 flex flex-col items-center gap-4">
          <Logo variant="login" />
          <p className="text-center text-sm text-slate-400">
            Gestão de transporte — acesse com seu usuário
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Usuário ou e-mail"
            name="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
            placeholder="admin ou admin@meb.local"
          />
          <Input
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
            <p className="rounded-lg bg-red-950/50 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </div>
    </div>
  );
}
