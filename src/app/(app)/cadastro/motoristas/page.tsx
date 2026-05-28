"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Users, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MotoristasForm } from "@/components/cadastro/motoristas-form";
import { calcularIdade } from "@/lib/utils";
import type { Motorista } from "@/types";

export default function MotoristasPage() {
  const [lista, setLista] = useState<Motorista[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Motorista | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("motoristas")
      .select("*")
      .order("nome_completo");
    setLista(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(id: string) {
    if (!confirm("Excluir este motorista?")) return;
    const supabase = createClient();
    await supabase.from("motoristas").delete().eq("id", id);
    load();
  }

  async function openEdit(m: Motorista) {
    const supabase = createClient();
    const { data: anexos } = await supabase
      .from("motorista_anexos")
      .select("*")
      .eq("motorista_id", m.id);
    setEditing({ ...m, anexos: anexos ?? [] } as Motorista & { anexos: unknown[] });
    setShowForm(true);
  }

  if (showForm) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold">
          {editing ? "Editar motorista" : "Novo motorista"}
        </h1>
        <MotoristasForm
          motorista={editing ?? undefined}
          onSaved={() => {
            setShowForm(false);
            setEditing(null);
            load();
          }}
          onCancel={() => {
            setShowForm(false);
            setEditing(null);
          }}
        />
      </div>
    );
  }

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8 text-cyan-400" />
          <div>
            <h1 className="text-2xl font-bold">Motoristas</h1>
            <p className="text-slate-400">Cadastro de motoristas</p>
          </div>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4" />
          Novo motorista
        </Button>
      </header>

      {loading ? (
        <p className="text-slate-400">Carregando...</p>
      ) : lista.length === 0 ? (
        <p className="text-slate-500">Nenhum motorista cadastrado.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-700/50">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-800/80 text-slate-400">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">CPF</th>
                <th className="px-4 py-3">Idade</th>
                <th className="px-4 py-3">CNH venc.</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((m) => (
                <tr key={m.id} className="border-t border-slate-700/50">
                  <td className="px-4 py-3">{m.nome_completo}</td>
                  <td className="px-4 py-3">{m.cpf}</td>
                  <td className="px-4 py-3">
                    {calcularIdade(m.data_nascimento) ?? "—"} anos
                  </td>
                  <td className="px-4 py-3">{m.cnh_vencimento ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" onClick={() => openEdit(m)} className="mr-2 text-cyan-400">
                      <Pencil className="h-4 w-4 inline" />
                    </button>
                    <button type="button" onClick={() => handleDelete(m.id)} className="text-red-400">
                      <Trash2 className="h-4 w-4 inline" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
