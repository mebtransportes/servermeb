"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Coins,
  FileText,
  HandCoins,
  Route,
  Truck,
  Users,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MotoristaAutocomplete } from "@/components/ui/motorista-autocomplete";
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

type ModoFechamento = "frota" | "terceiro";

function KpiCard({
  label,
  valor,
  icon: Icon,
  tone,
}: {
  label: string;
  valor: number;
  icon: typeof Wallet;
  tone: "amber" | "orange" | "emerald" | "sky";
}) {
  const styles = {
    amber: {
      accent: "border-l-amber-500",
      iconWrap: "bg-amber-100",
      icon: "text-amber-600",
      value: "text-amber-800",
    },
    orange: {
      accent: "border-l-orange-500",
      iconWrap: "bg-orange-100",
      icon: "text-orange-600",
      value: "text-orange-800",
    },
    emerald: {
      accent: "border-l-emerald-500",
      iconWrap: "bg-emerald-100",
      icon: "text-emerald-600",
      value: "text-emerald-800",
    },
    sky: {
      accent: "border-l-sky-500",
      iconWrap: "bg-sky-100",
      icon: "text-sky-600",
      value: "text-sky-800",
    },
  }[tone];

  return (
    <article
      className={cn(
        mebCard,
        "border-l-4 bg-white/90 p-4 shadow-sm",
        styles.accent
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            styles.iconWrap
          )}
        >
          <Icon className={cn("h-5 w-5", styles.icon)} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p
            className={cn(
              "mt-0.5 truncate text-xl font-bold tracking-tight tabular-nums",
              styles.value
            )}
          >
            {formatarMoeda(valor)}
          </p>
        </div>
      </div>
    </article>
  );
}

export default function FechamentoViagensPage() {
  const [fechamentos, setFechamentos] = useState<ViagemFechamento[]>([]);
  const [motoristas, setMotoristas] = useState<
    { id: string; nome_completo: string; cpf?: string }[]
  >([]);
  const [motoristaId, setMotoristaId] = useState("");
  const [modo, setModo] = useState<ModoFechamento>("frota");
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
    setSelectedIds(new Set());
  }, [motoristaId, periodo, modo]);

  const doMotorista = useMemo(
    () =>
      fechamentos.filter(
        (f) =>
          f.motorista_id === motoristaId &&
          !!f.motorista_terceiro === (modo === "terceiro")
      ),
    [fechamentos, motoristaId, modo]
  );

  const filtrados = useMemo(
    () => filtrarPorPeriodoConfig(doMotorista, periodo),
    [doMotorista, periodo]
  );

  const motoristaSelecionado = motoristas.find((m) => m.id === motoristaId);
  const motoristaNome = motoristaSelecionado?.nome_completo ?? "—";
  const periodoLabel = labelPeriodoConfig(periodo);

  const totalDespesas = filtrados.reduce((s, f) => s + totalDespesasFechamento(f), 0);
  const totalAdiantamentos = filtrados.reduce(
    (s, f) => s + (Number(f.adiantamento_valor) || 0),
    0
  );
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
      await mebAlert(
        modo === "frota"
          ? "Selecione ao menos uma viagem para gerar o recibo de comissão."
          : "Selecione ao menos uma viagem para gerar o recibo do terceiro."
      );
      return;
    }
    setShowComissao(true);
  }

  const tituloModo = modo === "frota" ? "Fechamento de Frota" : "Fechamento de Terceiros";
  const labelGerar =
    modo === "frota"
      ? `Gerar recibo comissão (${selectedIds.size})`
      : `Gerar recibo terceiro (${selectedIds.size})`;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
            <Route className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Fechamento de Viagens
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              {tituloModo} · viagens finalizadas e pagamento pendente
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="success"
          disabled={!motoristaId || !selectedIds.size}
          onClick={abrirComissao}
        >
          <FileText className="h-4 w-4" />
          {labelGerar}
        </Button>
      </header>

      <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
        <button
          type="button"
          onClick={() => setModo("frota")}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition",
            modo === "frota"
              ? "bg-sky-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          )}
        >
          <Truck className="h-4 w-4" />
          Frota
        </button>
        <button
          type="button"
          onClick={() => setModo("terceiro")}
          className={cn(
            "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition",
            modo === "terceiro"
              ? "bg-sky-600 text-white shadow-sm"
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          )}
        >
          <Users className="h-4 w-4" />
          Terceiros
        </button>
      </div>

      <div className={cn(mebFormSection, "space-y-0")}>
        <div className="flex flex-wrap items-end gap-4">
          <MotoristaAutocomplete
            label="Motorista"
            motoristas={motoristas}
            motoristaId={motoristaId}
            onMotoristaIdChange={setMotoristaId}
            required
            className="min-w-[220px] flex-1"
          />
          <PeriodoFilter value={periodo} onChange={setPeriodo} />
          <div className="flex flex-col gap-1">
            <span className="invisible text-sm font-medium text-slate-600" aria-hidden>
              Período
            </span>
            <Button
              type="button"
              variant="secondary"
              className="h-10 py-0 text-sm"
              disabled={!motoristaId || filtrados.length === 0}
              onClick={selecionarTodasVisiveis}
            >
              Selecionar todas no período
            </Button>
          </div>
        </div>
      </div>

      {!motoristaId ? (
        <div className={cn(mebCard, "border-dashed p-10 text-center")}>
          <Users className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-700">
            Selecione um motorista
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Escolha o motorista acima para ver os fechamentos do período.
          </p>
        </div>
      ) : loading ? (
        <div className={cn(mebCard, "p-10 text-center text-sm text-slate-500")}>
          Carregando fechamentos...
        </div>
      ) : (
        <>
          <section className="relative overflow-hidden rounded-2xl bg-sky-700 px-6 py-6 text-white shadow-sm">
            <div className="pointer-events-none absolute -right-12 top-0 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-16 left-1/3 h-32 w-32 rounded-full bg-cyan-300/20 blur-2xl" />
            <div className="relative flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">
                  {modo === "frota" ? "Comissão líquida" : "Repasse terceiro"}
                </p>
                <p className="mt-1 text-3xl font-bold tracking-tight tabular-nums">
                  {formatarMoeda(totalComissao)}
                </p>
                <p className="mt-1 text-sm text-white/75">
                  {motoristaNome} · {periodoLabel} · {filtrados.length} viagem(ns)
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 backdrop-blur-sm">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-white/70">
                    Despesas
                  </p>
                  <p className="mt-0.5 text-sm font-semibold tabular-nums">
                    {formatarMoeda(totalDespesas)}
                  </p>
                </div>
                {modo === "frota" ? (
                  <div className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 backdrop-blur-sm">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-white/70">
                      Adiantamentos
                    </p>
                    <p className="mt-0.5 text-sm font-semibold tabular-nums">
                      {formatarMoeda(totalAdiantamentos)}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 backdrop-blur-sm">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-white/70">
                      Selecionadas
                    </p>
                    <p className="mt-0.5 text-sm font-semibold tabular-nums">
                      {selectedIds.size}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>

          <div
            className={cn(
              "grid gap-3",
              modo === "frota" ? "sm:grid-cols-3" : "sm:grid-cols-2"
            )}
          >
            <KpiCard
              label="Total de despesas"
              valor={totalDespesas}
              icon={Wallet}
              tone="amber"
            />
            {modo === "frota" && (
              <KpiCard
                label="Total de adiantamentos"
                valor={totalAdiantamentos}
                icon={HandCoins}
                tone="orange"
              />
            )}
            <KpiCard
              label={
                modo === "frota" ? "Total comissão líquida" : "Total repasse terceiro"
              }
              valor={totalComissao}
              icon={Coins}
              tone={modo === "frota" ? "emerald" : "sky"}
            />
          </div>

          <EvolucaoMensalChart
            dados={graficoDespesas}
            titulo="Evolução das despesas do motorista"
            subtitulo="Últimos 6 meses · viagens finalizadas e pagamento pendente"
            tema="amber"
          />

          {filtrados.length === 0 ? (
            <div className={cn(mebCard, "border-dashed p-10 text-center")}>
              <p className="text-sm font-medium text-slate-700">
                Nenhum fechamento neste período
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Não há viagens de {modo === "frota" ? "frota" : "terceiro"} para este
                motorista em {periodoLabel.toLowerCase()}.
              </p>
            </div>
          ) : (
            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-slate-800">
                    Viagens do período
                  </h2>
                  <p className="text-xs text-slate-500">
                    {filtrados.length} registro(s)
                    {selectedIds.size > 0 && ` · ${selectedIds.size} selecionada(s)`}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {filtrados.map((f) => {
                  const elegivel = statusElegivelComissao(f.viagem_status ?? "FINALIZADO");
                  const checked = selectedIds.has(f.id);
                  const statusLabel =
                    VIAGEM_STATUS_LABEL[f.viagem_status ?? ""] ?? f.viagem_status ?? "—";
                  return (
                    <div
                      key={f.id}
                      className={cn(
                        "overflow-hidden rounded-xl transition",
                        checked && "ring-2 ring-sky-300 ring-offset-1"
                      )}
                    >
                      {elegivel && (
                        <label
                          className={cn(
                            "flex cursor-pointer items-center gap-3 border px-4 py-2.5 text-sm transition",
                            checked
                              ? "border-sky-200 bg-sky-50 text-sky-900"
                              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleSelect(f.id)}
                            className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                          />
                          <span className="font-medium">
                            {modo === "frota"
                              ? "Incluir no recibo de comissão"
                              : "Incluir no recibo"}
                          </span>
                          <span
                            className={cn(
                              "ml-auto rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase",
                              f.viagem_status === "PAGAMENTO PENDENTE"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-emerald-100 text-emerald-800"
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
            </section>
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
          modo={modo}
          onClose={() => setShowComissao(false)}
        />
      )}
    </div>
  );
}
