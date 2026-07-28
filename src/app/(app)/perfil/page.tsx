"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  KeyRound,
  Shield,
  User,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS, normalizeProfileRole } from "@/lib/roles";
import { cn, mebFormSection } from "@/lib/utils";

export default function PerfilPage() {
  const [username, setUsername] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [role, setRole] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("username, role")
        .eq("id", user.id)
        .single();
      if (data) {
        setUsername(data.username);
        setNewUsername(data.username);
        const r = normalizeProfileRole(data.role);
        setRole(ROLE_LABELS[r]);
        setIsAdmin(r === "admin");
      }
    }
    load();
  }, []);

  async function updateUsername(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const normalized = newUsername.trim().toLowerCase();
    const { error: err } = await supabase
      .from("profiles")
      .update({ username: normalized })
      .eq("id", user.id);

    setLoading(false);
    if (err) {
      setError(
        err.message.includes("unique") ? "Este nome de usuário já existe." : err.message
      );
      return;
    }
    setUsername(normalized);
    setMessage("Nome de usuário atualizado.");
  }

  async function updatePassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (newPassword !== confirmPassword) {
      setError("As senhas não coincidem.");
      return;
    }
    if (newPassword.length < 3) {
      setError("A senha deve ter pelo menos 3 caracteres.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("auth_email")
      .eq("username", username)
      .single();

    if (!profile) {
      setError("Perfil não encontrado.");
      setLoading(false);
      return;
    }

    const { error: signErr } = await supabase.auth.signInWithPassword({
      email: profile.auth_email,
      password: currentPassword,
    });

    if (signErr) {
      setError("Senha atual incorreta.");
      setLoading(false);
      return;
    }

    const { error: updErr } = await supabase.auth.updateUser({
      password: newPassword,
    });

    setLoading(false);
    if (updErr) {
      setError(updErr.message);
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setMessage("Senha atualizada com sucesso.");
  }

  const inicial = (username || newUsername || "?").slice(0, 1).toUpperCase();

  return (
    <div className="mx-auto max-w-4xl space-y-3">
      <section className="relative overflow-hidden rounded-xl bg-[#33388d] px-4 py-3.5 text-white shadow-sm">
        <div className="pointer-events-none absolute -right-8 top-0 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-wrap items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-base font-bold">
            {inicial}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight">Minha conta</h1>
              {role && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-semibold text-white/90">
                  <Shield className="h-3 w-3" />
                  {role}
                </span>
              )}
            </div>
            <p className="truncate text-xs text-white/75">
              {username ? `@${username}` : "Carregando perfil..."} · altere usuário e senha
            </p>
          </div>
          {isAdmin && (
            <Link
              href="/configuracoes/usuarios"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/20"
            >
              <Users className="h-3.5 w-3.5" />
              Gerenciar usuários
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </section>

      {message && (
        <p className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {message}
        </p>
      )}
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        <form
          onSubmit={updateUsername}
          className={cn(
            mebFormSection,
            "space-y-3 border border-slate-300 bg-white p-4 shadow-none"
          )}
        >
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600">
              <User className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Nome de usuário</h2>
              <p className="text-[11px] text-slate-500">Usado para entrar no sistema</p>
            </div>
          </div>
          <Input
            label="Novo nome de usuário"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            className="border-slate-300 bg-white py-2 text-sm"
            required
          />
          <Button type="submit" variant="success" className="py-2 text-sm" disabled={loading}>
            Salvar usuário
          </Button>
        </form>

        <form
          onSubmit={updatePassword}
          className={cn(
            mebFormSection,
            "space-y-3 border border-slate-300 bg-white p-4 shadow-none"
          )}
        >
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-amber-700">
              <KeyRound className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Senha</h2>
              <p className="text-[11px] text-slate-500">Confirme com a senha atual</p>
            </div>
          </div>
          <Input
            label="Senha atual"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="border-slate-300 bg-white py-2 text-sm"
            required
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Nova senha"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="border-slate-300 bg-white py-2 text-sm"
              required
            />
            <Input
              label="Confirmar nova senha"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="border-slate-300 bg-white py-2 text-sm"
              required
            />
          </div>
          <Button type="submit" variant="success" className="py-2 text-sm" disabled={loading}>
            Alterar senha
          </Button>
        </form>
      </div>
    </div>
  );
}
