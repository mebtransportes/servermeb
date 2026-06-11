"use client";

import { useCallback, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { MebModal, MebModalFooter, MebModalHeader } from "@/components/ui/modal";
import { Pencil, Plus, Users } from "lucide-react";
import {
  atualizarUsuario,
  criarUsuario,
  listarUsuarios,
  type UsuarioListItem,
} from "@/app/(app)/configuracoes/usuarios/actions";
import { ROLE_LABELS, ROLE_OPTIONS, type ProfileRole } from "@/lib/roles";

type FormState = {
  email: string;
  username: string;
  password: string;
  role: ProfileRole;
};

const emptyForm: FormState = {
  email: "",
  username: "",
  password: "",
  role: "mecanico",
};

export function UsuariosAdminPanel() {
  const [users, setUsers] = useState<UsuarioListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<UsuarioListItem | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const res = await listarUsuarios();
    setUsers(res.users);
    if (res.error) setError(res.error);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setModal("create");
    setMessage("");
    setError("");
  }

  function openEdit(user: UsuarioListItem) {
    setEditing(user);
    setForm({
      email: user.auth_email,
      username: user.username,
      password: "",
      role: user.role,
    });
    setModal("edit");
    setMessage("");
    setError("");
  }

  function closeModal() {
    setModal(null);
    setEditing(null);
    setForm(emptyForm);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    if (modal === "create") {
      const res = await criarUsuario(form);
      if (!res.ok) {
        setError(res.error ?? "Erro ao criar usuário.");
        setSaving(false);
        return;
      }
      setMessage("Usuário criado com sucesso.");
      closeModal();
      await load();
    } else if (modal === "edit" && editing) {
      const res = await atualizarUsuario({
        id: editing.id,
        email: form.email,
        username: form.username,
        role: form.role,
        password: form.password.trim() || undefined,
      });
      if (!res.ok) {
        setError(res.error ?? "Erro ao atualizar usuário.");
        setSaving(false);
        return;
      }
      setMessage("Usuário atualizado com sucesso.");
      closeModal();
      await load();
    }

    setSaving(false);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8 text-cyan-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Usuários do sistema</h1>
            <p className="text-base text-slate-400">
              Crie logins, defina perfil (Admin, Mecânico ou Inativo) e altere senhas
            </p>
          </div>
        </div>
        <Button type="button" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Novo usuário
        </Button>
      </header>

      {message && (
        <p className="rounded-lg border border-emerald-700/40 bg-emerald-950/30 px-4 py-2 text-sm text-emerald-300">
          {message}
        </p>
      )}
      {error && !modal && (
        <p className="rounded-lg border border-red-800/50 bg-red-950/40 px-4 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-[#2a2a2a]">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-[#262626] text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Usuário</th>
              <th className="px-4 py-3 font-medium">E-mail</th>
              <th className="px-4 py-3 font-medium">Perfil</th>
              <th className="px-4 py-3 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                  Carregando…
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                  Nenhum usuário cadastrado.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="border-t border-[#2a2a2a] text-slate-200">
                  <td className="px-4 py-3 font-medium">@{u.username}</td>
                  <td className="px-4 py-3">{u.auth_email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        u.role === "admin"
                          ? "text-cyan-400"
                          : u.role === "mecanico"
                            ? "text-amber-400"
                            : "text-slate-500"
                      }
                    >
                      {ROLE_LABELS[u.role]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      type="button"
                      variant="secondary"
                      className="inline-flex gap-1"
                      onClick={() => openEdit(u)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <MebModal open onClose={closeModal} aria-labelledby="usuario-modal-titulo">
          <form onSubmit={handleSubmit} className="p-6">
            <MebModalHeader
              id="usuario-modal-titulo"
              title={modal === "create" ? "Novo usuário" : "Editar usuário"}
              onClose={closeModal}
            />

            <div className="mt-4 space-y-4">
              <Input
                label="E-mail de acesso"
                type="email"
                tone="light"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                required
              />
              <Input
                label="Nome de usuário"
                tone="light"
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                required
                placeholder="ex: joao.mecanico"
              />
              <Input
                label={modal === "create" ? "Senha" : "Nova senha (opcional)"}
                type="password"
                tone="light"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                required={modal === "create"}
                placeholder={modal === "edit" ? "Deixe em branco para manter" : ""}
              />
              <Select
                label="Tipo de usuário"
                tone="light"
                value={form.role}
                onChange={(e) =>
                  setForm((f) => ({ ...f, role: e.target.value as ProfileRole }))
                }
                options={ROLE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              />
              {form.role === "inativo" && (
                <p className="text-sm text-slate-500">
                  Usuários inativos não conseguem fazer login no sistema.
                </p>
              )}

              {error && modal && (
                <p className="text-sm text-red-400">{error}</p>
              )}

              <MebModalFooter className="pt-2">
                <Button type="submit" variant="modal" disabled={saving}>
                  {saving ? "Salvando…" : modal === "create" ? "Cadastrar" : "Salvar"}
                </Button>
                <Button type="button" variant="secondary" onClick={closeModal}>
                  Cancelar
                </Button>
              </MebModalFooter>
            </div>
          </form>
        </MebModal>
      )}
    </div>
  );
}
