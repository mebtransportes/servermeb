"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { MebModal, MebModalBody, MebModalHeader } from "@/components/ui/modal";
import { formatarMoeda, formatarDataBr } from "@/lib/frota-filters";
import type { LinhaDetalhe } from "@/lib/custos-empresariais";
import type { DespesaEmpresarial } from "@/types/custos-empresariais";
import { mebAlert, mebConfirm } from "@/lib/meb-dialog";

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
    if (
      !(await mebConfirm("Excluir este lançamento? Esta ação não pode ser desfeita.", {
        variant: "danger",
        confirmLabel: "Excluir",
      }))
    ) {
      return;
    }
    setExcluindoId(id);
    const err = await onExcluirDespesa(id);
    setExcluindoId(null);
    if (err) await mebAlert(err);
  }

  return (
    <MebModal
      open
      onClose={onClose}
      maxWidth="max-w-lg"
      panelClassName="flex max-h-[85vh] flex-col"
      aria-labelledby="custo-emp-detalhe-titulo"
    >
      <div className="border-b border-[#2a2a2a] p-4">
        <MebModalHeader
          id="custo-emp-detalhe-titulo"
          title={titulo}
          description={`Total: ${formatarMoeda(total)}`}
          onClose={onClose}
        />
      </div>

      <MebModalBody className="flex-1 overflow-y-auto p-4">
        {linhas && linhas.length > 0 && (
          <ul className="mb-4 space-y-2">
            {linhas.map((l) => (
              <li
                key={l.label}
                className="flex flex-wrap justify-between gap-2 rounded-lg border border-[#2a2a2a] bg-[#262626] px-3 py-2 text-sm"
              >
                <div>
                  <span className="text-slate-200">{l.label}</span>
                  {l.extra && <p className="text-xs text-slate-500">{l.extra}</p>}
                </div>
                <span className="font-medium text-slate-200">{formatarMoeda(l.valor)}</span>
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
                  className="rounded-lg border border-[#2a2a2a] bg-[#262626] px-3 py-2 text-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <span className="font-medium text-slate-200">{d.nome_item}</span>
                      <p className="text-xs text-slate-500">
                        {formatarDataBr(d.data_despesa)} · Qtd:{" "}
                        {Math.round(Number(d.quantidade) || 1)} · {d.onde_comprou}
                      </p>
                    </div>
                    <span className="shrink-0 font-medium text-slate-200">
                      {formatarMoeda(Number(d.valor))}
                    </span>
                  </div>
                  {onExcluirDespesa && (
                    <button
                      type="button"
                      disabled={excluindoId === d.id}
                      onClick={() => handleExcluir(d.id)}
                      className="mt-2 flex w-full items-center justify-center gap-1 rounded-md border border-[#3a3a3a] bg-[#333333] py-1.5 text-xs text-red-300 hover:bg-[#3d3d3d] disabled:opacity-50"
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
      </MebModalBody>
    </MebModal>
  );
}
