"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Plus, Pencil, Trash2, LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LocalEntityForm } from "@/components/cadastro/local-entity-form";
import type { EnderecoEntidade } from "@/types";
import { mebConfirm } from "@/lib/meb-dialog";

type TableName = "postos" | "oficinas" | "clientes" | "fornecedores";

type Props = {
  table: TableName;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  documentLabel?: string;
  showObservacoes?: boolean;
};

export function LocalEntityPage({
  table,
  title,
  subtitle,
  icon: Icon,
  documentLabel,
  showObservacoes,
}: Props) {
  const [lista, setLista] = useState<(EnderecoEntidade & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<(EnderecoEntidade & { id: string }) | null>(
    null
  );
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase.from(table).select("*").order("nome");
    setLista(data ?? []);
    setLoading(false);
  }, [table]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(id: string) {
    if (
      !(await mebConfirm("Excluir este registro?", {
        variant: "danger",
        confirmLabel: "Excluir",
      }))
    ) {
      return;
    }
    const supabase = createClient();
    await supabase.from(table).delete().eq("id", id);
    load();
  }

  if (showForm) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-bold text-slate-900">
          {editing ? `Editar ${title.toLowerCase()}` : `Novo ${title.toLowerCase().replace(/s$/, "")}`}
        </h1>
        <LocalEntityForm
          table={table}
          entity={editing ?? undefined}
          documentLabel={documentLabel}
          showObservacoes={showObservacoes}
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
          <Icon className="h-8 w-8 text-slate-500" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
            <p className="text-slate-500">{subtitle}</p>
          </div>
        </div>
        <Button variant="success" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4" />
          Novo cadastro
        </Button>
      </header>

      {loading ? (
        <p className="text-slate-400">Carregando...</p>
      ) : lista.length === 0 ? (
        <p className="text-slate-500">Nenhum registro cadastrado.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white/60">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Documento</th>
                <th className="px-4 py-3">Cidade</th>
                <th className="px-4 py-3">Telefone</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((item) => (
                <tr key={item.id} className="border-t border-slate-100 hover:bg-white/50">
                  <td className="px-4 py-3 text-slate-800">{item.nome}</td>
                  <td className="px-4 py-3 text-slate-700">{item.documento ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {item.cidade ? `${item.cidade}/${item.estado}` : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{item.telefone ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(item);
                        setShowForm(true);
                      }}
                      className="mr-2 text-slate-600 hover:text-slate-900"
                    >
                      <Pencil className="h-4 w-4 inline" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
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
