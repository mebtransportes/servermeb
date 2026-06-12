"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Route, FileText, Wallet, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { PeriodoFilter } from "@/components/frota/periodo-filter";
import { FechamentoViagemCard } from "@/components/financeiro/fechamento-viagem-card";
import { EvolucaoMensalChart } from "@/components/financeiro/evolucao-mensal-chart";
import { buildGraficoMensalDespesas } from "@/lib/grafico-mensal";
import { GerarComissaoModal } from "@/components/financeiro/gerar-comissao-modal";
import { fetchMotoristasOptions, fetchViagemFechamentos } from "@/lib/fechamento-data";
import { filtrarPorPeriodoConfig } from "@/lib/custos-operacionais";
import {
  formatarMoeda,
  labelPeriodoConfig,
  PERIODO_FILTRO_INICIAL,
  type PeriodoFiltroState,
} from "@/lib/frota-filters";
import { totalDespesasFechamento } from "@/types/fechamento";
import type { ViagemFechamento } from "@/types/fechamento";
import { statusElegivelComissao } from "@/lib/viagem-status";
import { VIAGEM_STATUS_LABEL } from "@/lib/viagem-status";
import { cn, mebCard, mebFormSection } from "@/lib/utils";
import { mebAlert } from "@/lib/meb-dialog";

export default function FechamentoViagensPage() {
  const [fechamentos, setFechamentos] = useState<ViagemFechamento[]>([]);
  const [motoristas, setMotoristas] = useState<
    { id: string; nome_completo: string; cpf?: string }[]
  >([]);
  const [motoristaId, setMotoristaId] = useState("");
  const [periodo, setPeriodo] = useState<PeriodoFiltroState>(PERIODO_FILTRO_INICIAL);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showComissao, setShowComissao] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [f, m] = await Promise.all([fetchViagemFechamentos(), fetchMotoristasOptions()]);
    setFechamentos(f);
    setMotoristas(m);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!motoristaId && motoristas.length) setMotoristaId(motoristas[0].id);
  }, [motoristas, motoristaId]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [motoristaId, periodo]);

  const doMotorista = useMemo(
    () => fechamentos.filter((f) => f.motorista_id === motoristaId),
    [fechamentos, motoristaId]
  );

  const filtrados = useMemo(
    () => filtrarPorPeriodoConfig(doMotorista, periodo),
    [doMotorista, periodo]
  );

  const motoristaSelecionado = motoristas.find((m) => m.id === motoristaId);
  const motoristaNome = motoristaSelecionado?.nome_completo ?? "—";
  const periodoLabel = labelPeriodoConfig(periodo);

  const totalDespesas = filtrados.reduce((s, f) => s + totalDespesasFechamento(f), 0);
  const totalComissao = filtrados.reduce((s, f) => s + (Number(f.comissao_final) || 0), 0);

  const graficoDespesas = useMemo(
    () =>
      buildGraficoMensalDespesas(
        doMotorista.map((f) => ({
          dataRef: f.data_embarque,
          valor: totalDespesasFechamento(f),
        }))
      ),
    [doMotorista]
  );

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selecionarTodasVisiveis() {
    setSelectedIds(
      new Set(
        filtrados
          .filter((f) => statusElegivelComissao(f.viagem_status ?? "FINALIZADO"))
          .map((f) => f.id)
      )
    );
  }

  async function abrirComissao() {
    if (!selectedIds.size) {
      await mebAlert("Selecione ao menos uma viagem para gerar a comissão.");
      return;
    }
    setShowComissao(true);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Route className="h-8 w-8 text-emerald-600" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Fechamento de Viagens</h1>
            <p className="text-slate-500">
              Viagens finalizadas e com pagamento pendente · Arquivadas ficam só no acompanhamento
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="success"
          disabled={!motoristaId || !selectedIds.size}
          onClick={abrirComissao}
        >
          <FileText className="mr-2 h-4 w-4" />
          Gerar comissão ({selectedIds.size})
        </Button>
      </header>

      <div className={cn(mebFormSection, "flex flex-wrap items-end gap-4")}>
        <div className="min-w-[220px] flex-1">
          <label className="mb-1 block text-xs font-medium text-slate-500">Motorista</label>
          <Select
            value={motoristaId}
            onChange={(e) => setMotoristaId(e.target.value)}
            options={[
              { value: "", label: "Selecione..." },
              ...motoristas.map((m) => ({ value: m.id, label: m.nome_completo })),
            ]}
          />
        </div>
        <div>
          <label className="mb-2 block text-xs font-medium text-slate-500">Período</label>
          <PeriodoFilter value={periodo} onChange={setPeriodo} />
        </div>
        <Button type="button" variant="secondary" onClick={selecionarTodasVisiveis}>
          Selecionar todas no período
        </Button>
      </div>

      {!motoristaId ? (
        <p className="text-slate-500">Selecione um motorista para ver os fechamentos.</p>
      ) : loading ? (
        <p className="text-slate-500">Carregando...</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <article className={cn(mebCard, "border-amber-200/80 p-4")}>
              <div className="mb-1 flex items-center gap-2 text-slate-500">
                <Wallet className="h-5 w-5 text-amber-600" />
                <span className="text-sm">Total de despesas</span>
              </div>
              <p className="text-2xl font-bold text-amber-700">{formatarMoeda(totalDespesas)}</p>
            </article>
            <article className={cn(mebCard, "border-emerald-200/80 p-4")}>
              <div className="mb-1 flex items-center gap-2 text-slate-500">
                <Coins className="h-5 w-5 text-emerald-600" />
                <span className="text-sm">Total de comissão</span>
              </div>
              <p className="text-2xl font-bold text-emerald-700">{formatarMoeda(totalComissao)}</p>
            </article>
          </div>

          <EvolucaoMensalChart
            dados={graficoDespesas}
            titulo="Evolução das despesas do motorista"
            subtitulo="Últimos 6 meses · viagens finalizadas e pagamento pendente"
            tema="amber"
          />

          {filtrados.length === 0 ? (
            <p className="text-slate-500">
              Nenhum fechamento neste período. Finalize viagens ou marque como pagamento pendente
              em Acompanhamento.
            </p>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {filtrados.map((f) => {
                const elegivel = statusElegivelComissao(f.viagem_status ?? "FINALIZADO");
                const checked = selectedIds.has(f.id);
                const statusLabel =
                  VIAGEM_STATUS_LABEL[f.viagem_status ?? ""] ?? f.viagem_status ?? "—";
                return (
                  <div
                    key={f.id}
                    className={cn(
                      "rounded-xl transition",
                      checked && "ring-2 ring-cyan-200"
                    )}
                  >
                    {elegivel && (
                      <label className="mb-2 flex cursor-pointer items-center gap-2 px-1 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleSelect(f.id)}
                          className="rounded border-slate-300"
                        />
                        <span>Incluir na comissão</span>
                        <span
                          className={cn(
                            "rounded border px-2 py-0.5 text-[10px] font-semibold uppercase",
                            f.viagem_status === "PAGAMENTO PENDENTE"
                              ? "border-amber-200 bg-amber-50 text-amber-800"
                              : "border-emerald-200 bg-emerald-50 text-emerald-800"
                          )}
                        >
                          {statusLabel}
                        </span>
                      </label>
                    )}
                    <FechamentoViagemCard
                      f={f}
                      onUpdated={(atualizado) =>
                        setFechamentos((prev) =>
                          prev.map((item) =>
                            item.id === atualizado.id
                              ? { ...atualizado, viagem_status: f.viagem_status }
                              : item
                          )
                        )
                      }
                    />
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {showComissao && motoristaId && (
        <GerarComissaoModal
          motoristaId={motoristaId}
          motoristaNome={motoristaNome}
          motoristaDocumento={motoristaSelecionado?.cpf}
          periodoLabel={periodoLabel}
          fechamentos={doMotorista}
          selecionadosInicial={[...selectedIds]}
          onClose={() => setShowComissao(false)}
        />
      )}
    </div>
  );
}
