"use client";

import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CUSTO_CATEGORIA_LABEL,
  type CustoOperacionalCategoria,
  type CustoOperacionalLinha,
} from "@/lib/custos-operacionais";
import { formatarMoeda } from "@/lib/frota-filters";

export function CustosOperacionaisDetalheModal({
  categoria,
  linhas,
  onClose,
}: {
  categoria: CustoOperacionalCategoria;
  linhas: CustoOperacionalLinha[];
  onClose: () => void;
}) {
  const total = linhas.reduce((s, l) => s + l.valor, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl border border-slate-700 bg-slate-900 shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-700/50 p-4">
          <div>
            <h2 className="text-lg font-bold text-cyan-400">
              {CUSTO_CATEGORIA_LABEL[categoria]}
            </h2>
            <p className="text-sm text-slate-400">
              {linhas.length} lançamento(s) · Total {formatarMoeda(total)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {linhas.length === 0 ? (
            <p className="text-slate-500">Nenhum lançamento no período.</p>
          ) : (
            <ul className="space-y-2">
              {linhas.map((l) => (
                <li
                  key={l.id}
                  className="rounded-lg border border-slate-700/50 bg-slate-800/40 px-3 py-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white">{l.descricao}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(l.data).toLocaleString("pt-BR")} · {l.origem}
                      </p>
                      {l.detalhe && (
                        <p className="mt-0.5 text-xs text-slate-400">{l.detalhe}</p>
                      )}
                    </div>
                    <span className="shrink-0 font-semibold text-emerald-400">
                      {formatarMoeda(l.valor)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t border-slate-700/50 p-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </div>
  );
}
