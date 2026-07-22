"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Banknote, ChevronDown, FileBarChart, RefreshCw, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { RecebimentoLinha } from "@/components/financeiro/recebimento-linha";
import { RecebimentosRelatorioModal } from "@/components/financeiro/recebimentos-relatorio-modal";
import { RecebimentosViagensRelatorioModal } from "@/components/financeiro/recebimentos-viagens-relatorio-modal";
import { fetchRecebimentos, refreshTodosRecebimentosArquivados, type RecebimentoComCanhotos } from "@/lib/recebimento-viagem";
import {
  dataNoPeriodoConfig,
  formatarMoeda,
  labelPeriodoConfig,
  PERIODO_FILTRO_INICIAL,
  PERIODOS,
  type PeriodoFiltroState,
  type PeriodoPreset,
} from "@/lib/frota-filters";
import { calcularTotalAReceber } from "@/types/recebimento";
import {
  RECEBIMENTO_ENCARGO_LABEL,
  RECEBIMENTO_ENCARGO_STATUS_LABEL,
  RECEBIMENTO_STATUS_LABEL,
  type RecebimentoEncargoStatus,
  type RecebimentoEncargoTipo,
  type RecebimentoStatus,
} from "@/types/recebimento";
import { cn, mebCard, mebFormSection } from "@/lib/utils";
import type { RecursoVinculo } from "@/types";

type FiltroStatus = RecebimentoStatus | "sem_data" | "todos";
type FiltroVinculo = "todos" | RecursoVinculo;
type FiltroEncargoTipo = RecebimentoEncargoTipo | "todos";
type FiltroEncargoStatus = RecebimentoEncargoStatus | "todos";

const ENCARGO_TIPO_FILTROS: { value: FiltroEncargoTipo; label: string }[] = [
  { value: "todos", label: "Todos os tipos" },
  { value: "descarga", label: "Descarga" },
  { value: "diaria", label: "Diária" },
];

const ENCARGO_STATUS_FILTROS: { value: FiltroEncargoStatus; label: string }[] = [
  { value: "todos", label: "Todos os status" },
  { value: "sem_data", label: "Sem data" },
  { value: "pendente", label: "Pendente" },
  { value: "pago", label: "Pago" },
];

const STATUS_FILTROS: { value: FiltroStatus; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "sem_data", label: "Sem data" },
  { value: "pendente", label: "Pendentes" },
  { value: "pago", label: "Pagos" },
  { value: "vencido", label: "Vencidos" },
];

const VINCULO_FILTROS: { value: FiltroVinculo; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "frota", label: "Frota" },
  { value: "terceiro", label: "Terceiros" },
];

const PERIODO_OPCOES: { value: PeriodoPreset; label: string }[] = [
  ...PERIODOS,
  { value: "custom", label: "Datas específicas" },
];

const PERIODO_SAIDA_INICIAL: PeriodoFiltroState = {
  preset: "todos",
  dataDe: "",
  dataAte: "",
};

function filtrosRecebimentosAtivos(opts: {
  filtroVinculo: FiltroVinculo;
  filtroStatus: FiltroStatus;
  filtroEncargoTipo: FiltroEncargoTipo;
  filtroEncargoStatus: FiltroEncargoStatus;
  periodo: PeriodoFiltroState;
  periodoSaida: PeriodoFiltroState;
  buscaCte: string;
}) {
  return (
    opts.filtroVinculo !== "todos" ||
    opts.filtroStatus !== "todos" ||
    opts.filtroEncargoTipo !== "todos" ||
    opts.filtroEncargoStatus !== "todos" ||
    opts.buscaCte.trim() !== "" ||
    opts.periodo.preset !== PERIODO_FILTRO_INICIAL.preset ||
    opts.periodoSaida.preset !== PERIODO_SAIDA_INICIAL.preset ||
    (opts.periodoSaida.preset === "custom" &&
      (!!opts.periodoSaida.dataDe || !!opts.periodoSaida.dataAte))
  );
}

function dataReferenciaRecebimento(item: RecebimentoComCanhotos): string {
  return item.data_recebimento ?? item.created_at ?? "";
}

function dataReferenciaSaida(item: RecebimentoComCanhotos): string {
  return item.saida_em ?? "";
}

function recebimentoNoPeriodo(
  item: RecebimentoComCanhotos,
  periodo: PeriodoFiltroState
): boolean {
  const dataRef = dataReferenciaRecebimento(item);
  if (!dataRef) return periodo.preset === "todos";
  return dataNoPeriodoConfig(dataRef, periodo);
}

function saidaNoPeriodo(
  item: RecebimentoComCanhotos,
  periodo: PeriodoFiltroState
): boolean {
  if (periodo.preset === "todos") return true;
  const dataRef = dataReferenciaSaida(item);
  if (!dataRef) return false;
  return dataNoPeriodoConfig(dataRef, periodo);
}

function matchVinculo(item: RecebimentoComCanhotos, filtro: FiltroVinculo): boolean {
  if (filtro === "todos") return true;
  if (filtro === "frota") return item.eh_frota;
  return !item.eh_frota;
}

function matchEncargoFiltros(
  item: RecebimentoComCanhotos,
  tipo: FiltroEncargoTipo,
  statusEncargo: FiltroEncargoStatus
): boolean {
  if (tipo === "todos" && statusEncargo === "todos") return true;
  if (!item.encargos.length) return false;
  return item.encargos.some(
    (e) =>
      (tipo === "todos" || e.tipo === tipo) &&
      (statusEncargo === "todos" || e.status === statusEncargo)
  );
}

function matchBuscaCte(item: RecebimentoComCanhotos, termo: string): boolean {
  const q = termo.trim().toLowerCase();
  if (!q) return true;
  if (item.numero_cte?.toLowerCase().includes(q)) return true;
  return item.encargos.some((e) => e.numero_cte?.toLowerCase().includes(q));
}

function recebimentoSemDataRecebimento(item: RecebimentoComCanhotos): boolean {
  return !item.data_recebimento?.trim();
}

export function RecebimentosPageContent() {
  const [itens, setItens] = useState<RecebimentoComCanhotos[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroVinculo, setFiltroVinculo] = useState<FiltroVinculo>("todos");
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>("todos");
  const [filtroEncargoTipo, setFiltroEncargoTipo] = useState<FiltroEncargoTipo>("todos");
  const [filtroEncargoStatus, setFiltroEncargoStatus] = useState<FiltroEncargoStatus>("todos");
  const [periodo, setPeriodo] = useState<PeriodoFiltroState>(PERIODO_FILTRO_INICIAL);
  const [periodoSaida, setPeriodoSaida] = useState<PeriodoFiltroState>(PERIODO_SAIDA_INICIAL);
  const [showRelatorio, setShowRelatorio] = useState(false);
  const [showRelatorioViagens, setShowRelatorioViagens] = useState(false);
  const [modoRelatorio, setModoRelatorio] = useState<"recebimentos" | "encargos">("recebimentos");
  const [buscaCte, setBuscaCte] = useState("");

  const load = useCallback(async (opts?: { refresh?: boolean }) => {
    setLoading(true);
    if (opts?.refresh) {
      await refreshTodosRecebimentosArquivados();
    }
    const lista = await fetchRecebimentos();
    setItens(lista);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const porVinculo = useMemo(
    () => itens.filter((i) => matchVinculo(i, filtroVinculo)),
    [itens, filtroVinculo]
  );

  const noPeriodo = useMemo(
    () =>
      porVinculo.filter(
        (i) => recebimentoNoPeriodo(i, periodo) && saidaNoPeriodo(i, periodoSaida)
      ),
    [porVinculo, periodo, periodoSaida]
  );

  const filtrados = useMemo(() => {
    let lista = noPeriodo;
    if (filtroStatus !== "todos") {
      lista =
        filtroStatus === "sem_data"
          ? lista.filter(recebimentoSemDataRecebimento)
          : lista.filter((i) => i.status === filtroStatus);
    }
    if (filtroEncargoTipo !== "todos" || filtroEncargoStatus !== "todos") {
      lista = lista.filter((i) =>
        matchEncargoFiltros(i, filtroEncargoTipo, filtroEncargoStatus)
      );
    }
    if (buscaCte.trim()) {
      lista = lista.filter((i) => matchBuscaCte(i, buscaCte));
    }
    return lista;
  }, [noPeriodo, filtroStatus, filtroEncargoTipo, filtroEncargoStatus, buscaCte]);

  const resumo = useMemo(() => {
    let pendente = 0;
    let pago = 0;
    let vencido = 0;
    let semData = 0;
    for (const i of noPeriodo) {
      const t = calcularTotalAReceber(i);
      if (recebimentoSemDataRecebimento(i)) {
        semData += Number(i.valor_frete_total) || 0;
      }
      if (i.status === "pago") pago += t;
      else if (i.status === "vencido") vencido += t;
      else pendente += t;
    }
    return { pendente, pago, vencido, semData, total: pendente + pago + vencido };
  }, [noPeriodo]);

  const vinculoLabel = VINCULO_FILTROS.find((v) => v.value === filtroVinculo)?.label ?? "Todos";

  const temFiltrosAtivos = filtrosRecebimentosAtivos({
    filtroVinculo,
    filtroStatus,
    filtroEncargoTipo,
    filtroEncargoStatus,
    periodo,
    periodoSaida,
    buscaCte,
  });

  function limparFiltros() {
    setFiltroVinculo("todos");
    setFiltroStatus("todos");
    setFiltroEncargoTipo("todos");
    setFiltroEncargoStatus("todos");
    setPeriodo(PERIODO_FILTRO_INICIAL);
    setPeriodoSaida(PERIODO_SAIDA_INICIAL);
    setBuscaCte("");
  }

  function alterarPeriodo(preset: PeriodoPreset) {
    setPeriodo({
      preset,
      dataDe: preset === "custom" ? periodo.dataDe : "",
      dataAte: preset === "custom" ? periodo.dataAte : "",
    });
  }

  function alterarPeriodoSaida(preset: PeriodoPreset) {
    setPeriodoSaida({
      preset,
      dataDe: preset === "custom" ? periodoSaida.dataDe : "",
      dataAte: preset === "custom" ? periodoSaida.dataAte : "",
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <Banknote className="h-7 w-7 text-cyan-600" />
            Recebimentos
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Viagens <strong className="text-slate-700">arquivadas</strong> no acompanhamento entram
            aqui automaticamente. Filtre por frota ou terceiros e controle valores a receber da
            empresa contratante.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setShowRelatorioViagens(true)}
          >
            <FileBarChart className="mr-2 h-4 w-4" />
            Relatório por saída
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setModoRelatorio("recebimentos");
              setShowRelatorio(true);
            }}
          >
            <FileBarChart className="mr-2 h-4 w-4" />
            Gerar relatório
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setModoRelatorio("encargos");
              setShowRelatorio(true);
            }}
          >
            <FileBarChart className="mr-2 h-4 w-4" />
            Relatório de encargos
          </Button>
          <Button type="button" variant="secondary" onClick={() => load({ refresh: true })} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ResumoCard
          label="Pendente"
          valor={resumo.pendente}
          cor="text-amber-700"
          ativo={filtroStatus === "pendente"}
          onClick={() => setFiltroStatus((s) => (s === "pendente" ? "todos" : "pendente"))}
        />
        <ResumoCard
          label="Vencido"
          valor={resumo.vencido}
          cor="text-red-600"
          ativo={filtroStatus === "vencido"}
          onClick={() => setFiltroStatus((s) => (s === "vencido" ? "todos" : "vencido"))}
        />
        <ResumoCard
          label="Pago"
          valor={resumo.pago}
          cor="text-emerald-700"
          ativo={filtroStatus === "pago"}
          onClick={() => setFiltroStatus((s) => (s === "pago" ? "todos" : "pago"))}
        />
        <ResumoCard
          label="Sem Datas"
          valor={resumo.semData}
          cor="text-slate-700"
          ativo={filtroStatus === "sem_data"}
          onClick={() => setFiltroStatus((s) => (s === "sem_data" ? "todos" : "sem_data"))}
        />
      </div>

      <div className={cn(mebFormSection, "space-y-4")}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-slate-700">Filtros</p>
          {temFiltrosAtivos && (
            <button
              type="button"
              onClick={limparFiltros}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-3.5 w-3.5" />
              Limpar filtros
            </button>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          <Select
            label="Período"
            tone="light"
            value={periodo.preset}
            onChange={(e) => alterarPeriodo(e.target.value as PeriodoPreset)}
            options={PERIODO_OPCOES.map((p) => ({ value: p.value, label: p.label }))}
          />
          <Select
            label="Data de saída"
            tone="light"
            value={periodoSaida.preset}
            onChange={(e) => alterarPeriodoSaida(e.target.value as PeriodoPreset)}
            options={PERIODO_OPCOES.map((p) => ({ value: p.value, label: p.label }))}
          />
          <Select
            label="Vínculo"
            tone="light"
            value={filtroVinculo}
            onChange={(e) => setFiltroVinculo(e.target.value as FiltroVinculo)}
            options={VINCULO_FILTROS.map((v) => ({ value: v.value, label: v.label }))}
          />
          <Select
            label="Status do pagamento"
            tone="light"
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value as FiltroStatus)}
            options={STATUS_FILTROS.map((s) => ({ value: s.value, label: s.label }))}
          />
          <div className="relative sm:col-span-2 lg:col-span-1 xl:col-span-1">
            <label className="mb-1 block text-sm font-medium text-slate-600">
              Buscar CT-e
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={buscaCte}
                onChange={(e) => setBuscaCte(e.target.value)}
                placeholder="Número do CT-e..."
                className="w-full rounded-lg border border-slate-200 bg-white/80 py-2 pl-9 pr-3 text-sm text-slate-900 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </div>
          </div>
        </div>

        {(periodo.preset === "custom" || periodoSaida.preset === "custom") && (
          <div className="space-y-3">
            {periodo.preset === "custom" && (
              <div className="grid max-w-md gap-3 sm:grid-cols-2">
                <Input
                  label="Período — De"
                  type="date"
                  tone="light"
                  value={periodo.dataDe}
                  onChange={(e) => setPeriodo({ ...periodo, dataDe: e.target.value })}
                />
                <Input
                  label="Período — Até"
                  type="date"
                  tone="light"
                  value={periodo.dataAte}
                  onChange={(e) => setPeriodo({ ...periodo, dataAte: e.target.value })}
                />
              </div>
            )}
            {periodoSaida.preset === "custom" && (
              <div className="grid max-w-md gap-3 sm:grid-cols-2">
                <Input
                  label="Saída — De"
                  type="date"
                  tone="light"
                  value={periodoSaida.dataDe}
                  onChange={(e) =>
                    setPeriodoSaida({ ...periodoSaida, dataDe: e.target.value })
                  }
                />
                <Input
                  label="Saída — Até"
                  type="date"
                  tone="light"
                  value={periodoSaida.dataAte}
                  onChange={(e) =>
                    setPeriodoSaida({ ...periodoSaida, dataAte: e.target.value })
                  }
                />
              </div>
            )}
          </div>
        )}

        <details className="group rounded-lg border border-slate-200 bg-slate-50/60 open:bg-white">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-medium text-slate-700 marker:content-none [&::-webkit-details-marker]:hidden">
            <span>Filtros de encargos (opcional)</span>
            <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition group-open:rotate-180" />
          </summary>
          <div className="grid gap-3 border-t border-slate-200 px-4 py-3 sm:grid-cols-2">
            <Select
              label="Tipo de encargo"
              tone="light"
              value={filtroEncargoTipo}
              onChange={(e) => setFiltroEncargoTipo(e.target.value as FiltroEncargoTipo)}
              options={ENCARGO_TIPO_FILTROS.map((t) => ({ value: t.value, label: t.label }))}
            />
            <Select
              label="Status do encargo"
              tone="light"
              value={filtroEncargoStatus}
              onChange={(e) => setFiltroEncargoStatus(e.target.value as FiltroEncargoStatus)}
              options={ENCARGO_STATUS_FILTROS.map((s) => ({ value: s.value, label: s.label }))}
            />
          </div>
        </details>

        <p className="border-t border-slate-200/80 pt-3 text-sm text-slate-500">
          {filtrados.length} registro(s)
          {filtroVinculo !== "todos" && <> · {vinculoLabel}</>}
          {filtroStatus !== "todos" && (
            <>
              {" "}
              ·{" "}
              {filtroStatus === "sem_data"
                ? "Sem data"
                : RECEBIMENTO_STATUS_LABEL[filtroStatus as RecebimentoStatus]}
            </>
          )}
          {filtroEncargoTipo !== "todos" && (
            <> · Encargo: {RECEBIMENTO_ENCARGO_LABEL[filtroEncargoTipo]}</>
          )}
          {filtroEncargoStatus !== "todos" && (
            <> · Encargo {RECEBIMENTO_ENCARGO_STATUS_LABEL[filtroEncargoStatus]}</>
          )}
          {buscaCte.trim() && <> · CT-e: {buscaCte.trim()}</>}
          {periodo.preset !== "todos" && <> · {labelPeriodoConfig(periodo)}</>}
          {periodoSaida.preset !== "todos" && (
            <> · Saída: {labelPeriodoConfig(periodoSaida)}</>
          )}
          {" · "}
          total listado{" "}
          {formatarMoeda(filtrados.reduce((s, i) => s + calcularTotalAReceber(i), 0))}
        </p>
      </div>

      {loading ? (
        <p className="text-slate-400">Carregando...</p>
      ) : filtrados.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-8 text-center">
          <p className="text-slate-500">
            Nenhum recebimento encontrado
            {filtroVinculo !== "todos" && <> para {vinculoLabel.toLowerCase()}</>}. Arquive viagens
            no Acompanhamento para que apareçam aqui.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtrados.map((item) => (
            <RecebimentoLinha key={item.id} item={item} onAtualizado={() => load()} />
          ))}
        </div>
      )}

      <RecebimentosRelatorioModal
        itens={porVinculo}
        open={showRelatorio}
        onClose={() => setShowRelatorio(false)}
        modo={modoRelatorio}
        titulo={modoRelatorio === "encargos" ? "Relatório de Encargos" : "Relatório de Recebimentos"}
        pdfSlug={modoRelatorio === "encargos" ? "encargos-recebimentos" : "recebimentos"}
      />

      <RecebimentosViagensRelatorioModal
        open={showRelatorioViagens}
        onClose={() => setShowRelatorioViagens(false)}
      />
    </div>
  );
}

function ResumoCard({
  label,
  valor,
  cor,
  ativo,
  onClick,
}: {
  label: string;
  valor: number;
  cor: string;
  ativo?: boolean;
  onClick?: () => void;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        mebCard,
        "px-4 py-3 text-left transition",
        ativo && "border-cyan-300 bg-cyan-50/80 ring-1 ring-cyan-200",
        onClick && "cursor-pointer hover:bg-white/80"
      )}
    >
      <p className="text-xs text-slate-500">{label}</p>
      <p className={cn("text-lg font-bold", cor)}>{formatarMoeda(valor)}</p>
      {onClick && <p className="mt-1 text-[10px] text-slate-400">Clique para filtrar</p>}
    </Tag>
  );
}
