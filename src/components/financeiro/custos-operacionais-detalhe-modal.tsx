"use client";

import { Button } from "@/components/ui/button";
import { MebModal, MebModalBody, MebModalFooter, MebModalHeader } from "@/components/ui/modal";
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
    <MebModal
      open
      onClose={onClose}
      maxWidth="max-w-2xl"
      panelClassName="flex max-h-[85vh] flex-col"
      aria-labelledby="custo-op-detalhe-titulo"
    >
      <div className="border-b border-[#2a2a2a] p-4">
        <MebModalHeader
          id="custo-op-detalhe-titulo"
          title={CUSTO_CATEGORIA_LABEL[categoria]}
          description={`${linhas.length} lançamento(s) · Total ${formatarMoeda(total)}`}
          onClose={onClose}
        />
      </div>

      <MebModalBody className="flex-1 overflow-y-auto p-4">
        {linhas.length === 0 ? (
          <p className="text-slate-500">Nenhum lançamento no período.</p>
        ) : (
          <ul className="space-y-2">
            {linhas.map((l) => (
              <li
                key={l.id}
                className="rounded-lg border border-[#2a2a2a] bg-[#262626] px-3 py-2"
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
                    {l.desconto != null && l.desconto > 0 && (
                      <p className="mt-0.5 text-xs text-emerald-400">
                        Desconto: {formatarMoeda(l.desconto)}
                      </p>
                    )}
                  </div>
                  <span className="shrink-0 font-semibold text-slate-200">
                    {formatarMoeda(l.valor)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </MebModalBody>

      <div className="border-t border-[#2a2a2a] p-4">
        <MebModalFooter>
          <Button type="button" variant="secondary" onClick={onClose}>
            Fechar
          </Button>
        </MebModalFooter>
      </div>
    </MebModal>
  );
}
