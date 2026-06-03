"use client";

import { useState } from "react";
import { Trash2, X } from "lucide-react";
import { formatarMoeda, formatarDataBr } from "@/lib/frota-filters";
import type { LinhaDetalhe } from "@/lib/custos-empresariais";
import type { DespesaEmpresarial } from "@/types/custos-empresariais";

export function CustosEmpresariaisDetalheModal({
  titulo,
  total,
  linhas,
  despesas,
  onClose,
  onExcluirDespesa,
}: {
  titulo: string;
  total: number;
  linhas?: LinhaDetalhe[];
  despesas?: DespesaEmpresarial[];
  onClose: () => void;
  onExcluirDespesa?: (id: string) => Promise<string | null>;
}) {
  const [excluindoId, setExcluindoId] = useState<string | null>(null);

  async function handleExcluir(id: string) {
    if (!onExcluirDespesa) return;
    if (!confirm("Excluir este lançamento? Esta ação não pode ser desfeita.")) return;
    setExcluindoId(id);
    const err = await onExcluirDespesa(id);
    setExcluindoId(null);
    if (err) alert(err);
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-xl border border-slate-700 bg-slate-900 shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-700 p-4">
          <div>
            <h2 className="text-lg font-semibold text-white">{titulo}</h2>
            <p className="text-sm text-purple-300">Total: {formatarMoeda(total)}</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {linhas && linhas.length > 0 && (
            <ul className="mb-4 space-y-2">
              {linhas.map((l) => (
                <li
                  key={l.label}
                  className="flex flex-wrap justify-between gap-2 rounded-lg border border-slate-700/50 bg-slate-800/40 px-3 py-2 text-sm"
                >
                  <div>
                    <span className="text-slate-200">{l.label}</span>
                    {l.extra && <p className="text-xs text-slate-500">{l.extra}</p>}
                  </div>
                  <span className="font-medium text-purple-300">{formatarMoeda(l.valor)}</span>
                </li>
              ))}
            </ul>
          )}
          {despesas && despesas.length > 0 && (
            <>
              {onExcluirDespesa && (
                <p className="mb-2 text-xs text-slate-500">
                  Você pode excluir qualquer lançamento cadastrado abaixo.
                </p>
              )}
              <ul className="space-y-2">
                {despesas.map((d) => (
                  <li
                    key={d.id}
                    className="rounded-lg border border-slate-700/50 bg-slate-800/40 px-3 py-2 text-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <span className="font-medium text-slate-200">{d.nome_item}</span>
                        <p className="text-xs text-slate-500">
                          {formatarDataBr(d.data_despesa)} · Qtd:{" "}
                          {Math.round(Number(d.quantidade) || 1)} ·{" "}
                          {d.onde_comprou}
                        </p>
                      </div>
                      <span className="shrink-0 font-medium text-purple-300">
                        {formatarMoeda(Number(d.valor))}
                      </span>
                    </div>
                    {onExcluirDespesa && (
                      <button
                        type="button"
                        disabled={excluindoId === d.id}
                        onClick={() => handleExcluir(d.id)}
                        className="mt-2 flex w-full items-center justify-center gap-1 rounded-md bg-slate-700/80 py-1.5 text-xs text-red-300 hover:bg-red-900/60 disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {excluindoId === d.id ? "Excluindo..." : "Excluir lançamento"}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
          {(!linhas || linhas.length === 0) && (!despesas || despesas.length === 0) && (
            <p className="text-center text-slate-500">Nenhum detalhe neste período.</p>
          )}
        </div>
      </div>
    </div>
  );
}
