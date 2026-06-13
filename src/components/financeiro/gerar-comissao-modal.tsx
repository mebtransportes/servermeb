"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { FechamentoViagemDetalhe } from "@/components/financeiro/fechamento-viagem-detalhe";
import { gerarPdfFechamentosLote } from "@/lib/fechamento-relatorio-pdf";
import { fetchOutrosDespesasPorViagens, type FechamentoOutroDespesa } from "@/lib/fechamento-outros-despesas";
import {
  fetchAdiantamentosPorViagens,
  type FechamentoAdiantamento,
} from "@/lib/fechamento-adiantamentos";
import { formatarMoeda } from "@/lib/frota-filters";
import type { ViagemFechamento } from "@/types/fechamento";
import { agruparFechamentosComissao } from "@/types/fechamento";
import { statusElegivelComissao } from "@/lib/viagem-status";
import { VIAGEM_STATUS_LABEL } from "@/lib/viagem-status";
import { FileText } from "lucide-react";
import { MebModal, MebModalFooter, MebModalHeader } from "@/components/ui/modal";
import { cn } from "@/lib/utils";
import { mebAlert } from "@/lib/meb-dialog";

export function GerarComissaoModal({
  motoristaNome,
  motoristaDocumento,
  periodoLabel,
  fechamentos,
  selecionadosInicial,
  modo = "frota",
  onClose,
}: {
  motoristaId: string;
  motoristaNome: string;
  motoristaDocumento?: string | null;
  periodoLabel?: string;
  fechamentos: ViagemFechamento[];
  selecionadosInicial: string[];
  modo?: "frota" | "terceiro";
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

  const viagemIds = useMemo(() => elegiveis.map((f) => f.viagem_id), [elegiveis]);
  const [outrosPorViagem, setOutrosPorViagem] = useState(
    () => new Map<string, FechamentoOutroDespesa[]>()
  );
  const [adiantamentosPorViagem, setAdiantamentosPorViagem] = useState(
    () => new Map<string, FechamentoAdiantamento[]>()
  );
  const [outrosCarregados, setOutrosCarregados] = useState(false);

  useEffect(() => {
    if (!viagemIds.length) {
      setOutrosPorViagem(new Map());
      setAdiantamentosPorViagem(new Map());
      setOutrosCarregados(true);
      return;
    }
    setOutrosCarregados(false);
    Promise.all([
      fetchOutrosDespesasPorViagens(viagemIds),
      fetchAdiantamentosPorViagens(viagemIds),
    ]).then(([outros, adiantamentos]) => {
      setOutrosPorViagem(outros);
      setAdiantamentosPorViagem(adiantamentos);
      setOutrosCarregados(true);
    });
  }, [viagemIds]);

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
      await mebAlert("Selecione ao menos uma viagem (finalizada ou pagamento pendente).");
      return;
    }
    await gerarPdfFechamentosLote({
      motoristaNome,
      motoristaDocumento,
      periodoLabel,
      fechamentos: selecionados,
    });
  }

  return (
    <MebModal
      open
      onClose={onClose}
      maxWidth="max-w-5xl"
      panelClassName="flex max-h-[92vh] flex-col"
      aria-labelledby="comissao-titulo"
    >
      <div className="shrink-0 border-b border-[#2a2a2a] px-6 py-4">
        <MebModalHeader
          id="comissao-titulo"
          title={modo === "frota" ? "Gerar recibo de comissão" : "Gerar recibo terceiro"}
          description={`Motorista: ${motoristaNome}. Selecione as viagens para o relatório de fechamento.`}
          onClose={onClose}
        />
      </div>

        <div className="shrink-0 border-b border-[#2a2a2a] px-6 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="modal" onClick={selecionarTodas}>
              Selecionar todas
            </Button>
            <Button type="button" variant="secondary" onClick={limparSelecao}>
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
                <div className="rounded-xl border border-[#2a2a2a] bg-[#262626] p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
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
                      label="Adiantamentos"
                      value={formatarMoeda(resumo.adiantamento_valor)}
                      destaque={resumo.adiantamento_valor > 0}
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
                          ? "border-slate-500 bg-[#2d2d2d]"
                          : "border-[#2a2a2a] bg-[#262626]"
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
                        <span className="shrink-0 text-right text-sm">
                          <span className="block font-semibold text-slate-200">
                            {formatarMoeda(f.comissao_final)}
                          </span>
                          {(f.adiantamento_valor ?? 0) > 0 && (
                            <span className="text-[10px] text-orange-300">
                              Adv. −{formatarMoeda(f.adiantamento_valor ?? 0)}
                            </span>
                          )}
                        </span>
                      </label>
                      {checked && (
                        <FechamentoViagemDetalhe
                          f={f}
                          outrosDespesas={
                            outrosCarregados
                              ? outrosPorViagem.get(f.viagem_id) ?? []
                              : undefined
                          }
                          adiantamentos={
                            outrosCarregados
                              ? adiantamentosPorViagem.get(f.viagem_id) ?? []
                              : undefined
                          }
                        />
                      )}
                    </article>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <MebModalFooter className="shrink-0 justify-end border-t border-[#2a2a2a] px-6 py-4">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="modal"
            disabled={!selecionados.length}
            onClick={gerar}
          >
            <FileText className="mr-2 h-4 w-4" />
            Gerar recibo PDF ({selectedIds.size})
          </Button>
        </MebModalFooter>
    </MebModal>
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
          destaque ? "text-white" : "text-slate-200"
        )}
      >
        {value}
      </p>
    </div>
  );
}
