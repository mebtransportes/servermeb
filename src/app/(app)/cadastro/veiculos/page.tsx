"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Car, Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VeiculosForm } from "@/components/cadastro/veiculos-form";
import type { Veiculo } from "@/types";
import { labelVinculo, VEICULO_TIPO_OPCOES } from "@/lib/viagem-validation";
import { mebConfirm } from "@/lib/meb-dialog";

function labelTipo(tipo: Veiculo["tipo"] | undefined) {
  return VEICULO_TIPO_OPCOES.find((o) => o.value === tipo)?.label ?? "—";
}

export default function VeiculosPage() {
  const [lista, setLista] = useState<Veiculo[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Veiculo | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("veiculos")
      .select("*")
      .order("created_at", { ascending: false });
    setLista(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(id: string) {
    if (
      !(await mebConfirm("Excluir este veículo?", {
        variant: "danger",
        confirmLabel: "Excluir",
      }))
    ) {
      return;
    }
    const supabase = createClient();
    await supabase.from("veiculos").delete().eq("id", id);
    load();
  }

  async function openEdit(v: Veiculo) {
    const supabase = createClient();
    const { data: campos } = await supabase
      .from("veiculo_campos_custom")
      .select("*")
      .eq("veiculo_id", v.id);
    const { data: anexos } = await supabase
      .from("veiculo_anexos")
      .select("*")
      .eq("veiculo_id", v.id);
    setEditing({ ...v, campos: campos ?? [], anexos: anexos ?? [] } as Veiculo & {
      campos: unknown[];
      anexos: unknown[];
    });
    setShowForm(true);
  }

  if (showForm) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold text-slate-900">
          {editing ? "Editar veículo" : "Novo veículo"}
        </h1>
        <VeiculosForm
          veiculo={editing ?? undefined}
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
          <Car className="h-8 w-8 text-slate-500" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Veículos</h1>
            <p className="text-slate-500">Cadastro da frota</p>
          </div>
        </div>
        <Button variant="success" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4" />
          Novo veículo
        </Button>
      </header>

      {loading ? (
        <p className="text-slate-400">Carregando...</p>
      ) : lista.length === 0 ? (
        <p className="text-slate-500">Nenhum veículo cadastrado.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white/60">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Vínculo</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Placa</th>
                <th className="px-4 py-3">Ano/Modelo</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((v) => (
                <tr key={v.id} className="border-t border-slate-100 hover:bg-white/50">
                  <td className="px-4 py-3 text-slate-800">{v.nome}</td>
                  <td className="px-4 py-3 text-slate-700">{labelVinculo(v.vinculo)}</td>
                  <td className="px-4 py-3 text-slate-700">{labelTipo(v.tipo)}</td>
                  <td className="px-4 py-3 font-mono text-slate-800">{v.placa}</td>
                  <td className="px-4 py-3 text-slate-700">{v.ano_modelo ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {v.financiado ? "Financiado" : v.quitado ? "Quitado" : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => openEdit(v)}
                      className="mr-2 text-slate-600 hover:text-slate-900"
                    >
                      <Pencil className="h-4 w-4 inline" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(v.id)}
                      className="text-red-600 hover:text-red-700"
                    >
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
