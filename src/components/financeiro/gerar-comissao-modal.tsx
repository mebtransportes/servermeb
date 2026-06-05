"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { PeriodoFilter } from "@/components/frota/periodo-filter";
import { FechamentoViagemDetalhe } from "@/components/financeiro/fechamento-viagem-detalhe";
import { gerarPdfComissaoMotorista } from "@/lib/comissao-pdf";
import { filtrarPorPeriodoConfig } from "@/lib/custos-operacionais";
import {
  formatarMoeda,
  labelPeriodoConfig,
  PERIODO_FILTRO_INICIAL,
  type PeriodoFiltroState,
} from "@/lib/frota-filters";
import type { ViagemFechamento } from "@/types/fechamento";
import { totalDespesasFechamento } from "@/types/fechamento";
import { Coins, FileText, Wallet, X } from "lucide-react";

export function GerarComissaoModal({
  motoristaNome,
  fechamentos,
  periodoInicial,
  onClose,
}: {
  motoristaId: string;
  motoristaNome: string;
  fechamentos: ViagemFechamento[];
  periodoInicial?: PeriodoFiltroState;
  onClose: () => void;
}) {
  const [periodo, setPeriodo] = useState<PeriodoFiltroState>(
    periodoInicial ?? PERIODO_FILTRO_INICIAL
  );

  const filtrados = useMemo(
    () => filtrarPorPeriodoConfig(fechamentos, periodo),
    [fechamentos, periodo]
  );

  const totalDespesas = filtrados.reduce((s, f) => s + totalDespesasFechamento(f), 0);
  const totalComissao = filtrados.reduce((s, f) => s + (Number(f.comissao_final) || 0), 0);

  function gerar() {
    if (!filtrados.length) {
      alert("Nenhuma viagem finalizada neste período para este motorista.");
      return;
    }
    gerarPdfComissaoMotorista({
      motoristaNome,
      periodoLabel: labelPeriodoConfig(periodo),
      fechamentos: filtrados,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col rounded-xl border border-slate-700 bg-slate-900 shadow-xl">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-700/60 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Gerar comissão</h2>
            <p className="mt-1 text-sm text-slate-400">
              Motorista: <span className="text-slate-200">{motoristaNome}</span>
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Revise o fechamento completo de cada viagem antes de gerar o PDF.
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="shrink-0 border-b border-slate-700/60 px-6 py-4">
          <label className="mb-2 block text-xs text-slate-400">Período do relatório</label>
          <PeriodoFilter value={periodo} onChange={setPeriodo} />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {filtrados.length === 0 ? (
            <p className="text-slate-500">Nenhum fechamento neste período.</p>
          ) : (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <article className="rounded-xl border border-amber-700/40 bg-amber-950/20 p-4">
                  <div className="mb-1 flex items-center gap-2 text-amber-400/80">
                    <Wallet className="h-5 w-5" />
                    <span className="text-sm">Total de despesas</span>
                  </div>
                  <p className="text-2xl font-bold text-amber-300">{formatarMoeda(totalDespesas)}</p>
                </article>
                <article className="rounded-xl border border-emerald-700/40 bg-emerald-950/20 p-4">
                  <div className="mb-1 flex items-center gap-2 text-emerald-400/80">
                    <Coins className="h-5 w-5" />
                    <span className="text-sm">Total de comissão</span>
                  </div>
                  <p className="text-2xl font-bold text-emerald-300">{formatarMoeda(totalComissao)}</p>
                </article>
              </div>

              <p className="text-sm text-slate-400">
                {filtrados.length} viagem(ns) no período · {labelPeriodoConfig(periodo)}
              </p>

              <div className="grid gap-4 lg:grid-cols-2">
                {filtrados.map((f) => (
                  <article
                    key={f.id}
                    className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-4"
                  >
                    <FechamentoViagemDetalhe f={f} />
                  </article>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-slate-700/60 px-6 py-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" disabled={!filtrados.length} onClick={gerar}>
            <FileText className="mr-2 h-4 w-4" />
            Gerar PDF
          </Button>
        </div>
      </div>
    </div>
  );
}
