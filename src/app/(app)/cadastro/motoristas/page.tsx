"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Users, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MotoristasForm } from "@/components/cadastro/motoristas-form";
import { calcularIdade } from "@/lib/utils";
import type { Motorista } from "@/types";
import { isFrota, labelVinculo } from "@/lib/viagem-validation";
import { mebConfirm } from "@/lib/meb-dialog";

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
    if (
      !(await mebConfirm("Excluir este motorista?", {
        variant: "danger",
        confirmLabel: "Excluir",
      }))
    ) {
      return;
    }
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
        <h1 className="mb-6 text-2xl font-bold text-slate-900">
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
          <Users className="h-8 w-8 text-slate-500" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Motoristas</h1>
            <p className="text-slate-500">Cadastro de motoristas</p>
          </div>
        </div>
        <Button variant="success" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4" />
          Novo motorista
        </Button>
      </header>

      {loading ? (
        <p className="text-slate-400">Carregando...</p>
      ) : lista.length === 0 ? (
        <p className="text-slate-500">Nenhum motorista cadastrado.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white/60">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Vínculo</th>
                <th className="px-4 py-3">CPF</th>
                <th className="px-4 py-3">Idade</th>
                <th className="px-4 py-3">CNH venc.</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((m) => (
                <tr key={m.id} className="border-t border-slate-100 hover:bg-white/50">
                  <td className="px-4 py-3 text-slate-800">{m.nome_completo}</td>
                  <td className="px-4 py-3 text-slate-700">{labelVinculo(m.vinculo)}</td>
                  <td className="px-4 py-3 text-slate-700">{m.cpf}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {m.data_nascimento ? `${calcularIdade(m.data_nascimento) ?? "—"} anos` : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {isFrota(m.vinculo) ? (m.cnh_vencimento ?? "—") : "Não exigido"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button type="button" onClick={() => openEdit(m)} className="mr-2 text-slate-600 hover:text-slate-900">
                      <Pencil className="h-4 w-4 inline" />
                    </button>
                    <button type="button" onClick={() => handleDelete(m.id)} className="text-red-600 hover:text-red-700">
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
