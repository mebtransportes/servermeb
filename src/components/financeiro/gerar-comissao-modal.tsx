"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { FechamentoViagemDetalhe } from "@/components/financeiro/fechamento-viagem-detalhe";
import { gerarPdfComissaoMotorista } from "@/lib/comissao-pdf";
import { formatarMoeda } from "@/lib/frota-filters";
import type { ViagemFechamento } from "@/types/fechamento";
import { agruparFechamentosComissao } from "@/types/fechamento";
import { statusElegivelComissao } from "@/lib/viagem-status";
import { VIAGEM_STATUS_LABEL } from "@/lib/viagem-status";
import { FileText, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function GerarComissaoModal({
  motoristaNome,
  motoristaDocumento,
  periodoLabel,
  fechamentos,
  selecionadosInicial,
  onClose,
}: {
  motoristaId: string;
  motoristaNome: string;
  motoristaDocumento?: string | null;
  periodoLabel?: string;
  fechamentos: ViagemFechamento[];
  selecionadosInicial: string[];
  onClose: () => void;
}) {
  const elegiveis = useMemo(
    () =>
      fechamentos.filter((f) =>
        statusElegivelComissao(f.viagem_status ?? "FINALIZADO")
      ),
    [fechamentos]
  );

  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(selecionadosInicial.filter((id) => elegiveis.some((f) => f.id === id)))
  );

  const selecionados = useMemo(
    () => elegiveis.filter((f) => selectedIds.has(f.id)),
    [elegiveis, selectedIds]
  );

  const resumo = useMemo(
    () => agruparFechamentosComissao(selecionados),
    [selecionados]
  );

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selecionarTodas() {
    setSelectedIds(new Set(elegiveis.map((f) => f.id)));
  }

  function limparSelecao() {
    setSelectedIds(new Set());
  }

  async function gerar() {
    if (!selecionados.length) {
      alert("Selecione ao menos uma viagem (finalizada ou pagamento pendente).");
      return;
    }
    await gerarPdfComissaoMotorista({
      motoristaNome,
      motoristaDocumento,
      periodoLabel,
      fechamentos: selecionados,
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
              Selecione as viagens para juntar gastos, fretes e comissão no relatório.
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="shrink-0 border-b border-slate-700/60 px-6 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="secondary" onClick={selecionarTodas}>
              Selecionar todas
            </Button>
            <Button type="button" variant="ghost" onClick={limparSelecao}>
              Limpar seleção
            </Button>
            <span className="text-sm text-slate-400">
              {selectedIds.size} de {elegiveis.length} viagem(ns) selecionada(s)
            </span>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {elegiveis.length === 0 ? (
            <p className="text-slate-500">
              Nenhuma viagem finalizada ou com pagamento pendente para este motorista.
            </p>
          ) : (
            <div className="space-y-6">
              {selecionados.length > 0 && (
                <div className="rounded-xl border border-cyan-800/40 bg-cyan-950/20 p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-cyan-400">
                    Resumo agrupado ({resumo.viagens} viagem(ns))
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <ResumoItem label="KM rodado" value={resumo.km_rodado.toLocaleString("pt-BR")} />
                    <ResumoItem label="Frete bruto" value={formatarMoeda(resumo.valor_frete)} />
                    <ResumoItem label="Frete líquido" value={formatarMoeda(resumo.frete_liquido)} />
                    <ResumoItem label="Total despesas" value={formatarMoeda(resumo.despesas)} />
                    <ResumoItem
                      label="Reembolso"
                      value={formatarMoeda(resumo.reembolso_valor)}
                    />
                    <ResumoItem
                      label="Abastecimento"
                      value={formatarMoeda(resumo.abastecimento_valor)}
                    />
                    <ResumoItem
                      label="Litros"
                      value={
                        resumo.abastecimento_litros.toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                        }) + " L"
                      }
                    />
                    <ResumoItem
                      label="Comissão final"
                      value={formatarMoeda(resumo.comissao_final)}
                      destaque
                    />
                  </div>
                </div>
              )}

              <div className="grid gap-4 lg:grid-cols-2">
                {elegiveis.map((f) => {
                  const checked = selectedIds.has(f.id);
                  const statusLabel =
                    VIAGEM_STATUS_LABEL[f.viagem_status ?? ""] ?? f.viagem_status ?? "—";
                  return (
                    <article
                      key={f.id}
                      className={cn(
                        "rounded-xl border p-4 transition",
                        checked
                          ? "border-cyan-600/50 bg-cyan-950/20"
                          : "border-slate-700/50 bg-slate-800/30"
                      )}
                    >
                      <label className="mb-3 flex cursor-pointer items-start gap-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggle(f.id)}
                          className="mt-1 rounded border-slate-600"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-white">
                            {new Date(f.data_embarque).toLocaleDateString("pt-BR")} —{" "}
                            {f.destino ?? f.local_embarque}
                          </p>
                          <p className="text-xs text-slate-400">
                            CTE: {f.numero_cte ?? "—"} · {f.veiculo_label}
                          </p>
                          <span
                            className={cn(
                              "mt-1 inline-block rounded px-2 py-0.5 text-[10px] font-semibold uppercase",
                              f.viagem_status === "PAGAMENTO PENDENTE"
                                ? "bg-amber-900/50 text-amber-300"
                                : "bg-emerald-900/50 text-emerald-300"
                            )}
                          >
                            {statusLabel}
                          </span>
                        </div>
                        <span className="shrink-0 text-sm font-semibold text-emerald-400">
                          {formatarMoeda(f.comissao_final)}
                        </span>
                      </label>
                      {checked && <FechamentoViagemDetalhe f={f} />}
                    </article>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-slate-700/60 px-6 py-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" disabled={!selecionados.length} onClick={gerar}>
            <FileText className="mr-2 h-4 w-4" />
            Gerar recibo PDF ({selectedIds.size})
          </Button>
        </div>
      </div>
    </div>
  );
}

function ResumoItem({
  label,
  value,
  destaque,
}: {
  label: string;
  value: string;
  destaque?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p
        className={cn(
          "text-sm font-semibold",
          destaque ? "text-emerald-400" : "text-slate-200"
        )}
      >
        {value}
      </p>
    </div>
  );
}
