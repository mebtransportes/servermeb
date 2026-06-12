"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import Link from "next/link";
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
      setError(err.message.includes("unique") ? "Este nome de usuário já existe." : err.message);
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

  return (
    <div className="max-w-lg">
      <header className="mb-8 flex items-center gap-3">
        <Settings className="h-8 w-8 text-cyan-600" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Minha conta</h1>
          <p className="text-slate-500">
            {role ? `Perfil: ${role} · ` : ""}
            Altere usuário e senha
          </p>
        </div>
      </header>

      {message && (
        <p className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {message}
        </p>
      )}
      {error && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {isAdmin && (
        <Link
          href="/configuracoes/usuarios"
          className="mb-6 block rounded-xl border border-cyan-200 bg-cyan-50/80 px-4 py-3 text-sm text-cyan-800 hover:border-cyan-300 hover:bg-cyan-50"
        >
          Gerenciar usuários do sistema →
        </Link>
      )}

      <form onSubmit={updateUsername} className={cn(mebFormSection, "mb-8 space-y-4")}>
        <h2 className="font-semibold text-slate-900">Nome de usuário</h2>
        <Input
          label="Novo nome de usuário"
          value={newUsername}
          onChange={(e) => setNewUsername(e.target.value)}
          required
        />
        <Button type="submit" variant="success" disabled={loading}>
          Salvar usuário
        </Button>
      </form>

      <form onSubmit={updatePassword} className={cn(mebFormSection, "space-y-4")}>
        <h2 className="font-semibold text-slate-900">Senha</h2>
        <Input
          label="Senha atual"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
        />
        <Input
          label="Nova senha"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
        />
        <Input
          label="Confirmar nova senha"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
        <Button type="submit" variant="success" disabled={loading}>
          Alterar senha
        </Button>
      </form>
    </div>
  );
}
