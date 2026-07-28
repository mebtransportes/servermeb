"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  Banknote,
  CalendarOff,
  CheckCircle2,
  ChevronDown,
  Clock,
  FileBarChart,
  Filter,
  RefreshCw,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
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
  const [menuRelatorioAberto, setMenuRelatorioAberto] = useState(false);
  const [menuRelatorioPos, setMenuRelatorioPos] = useState({ top: 0, left: 0 });
  const menuRelatorioRef = useRef<HTMLDivElement>(null);
  const botaoRelatorioRef = useRef<HTMLButtonElement>(null);
  const [buscaCte, setBuscaCte] = useState("");

  function abrirMenuRelatorio() {
    const rect = botaoRelatorioRef.current?.getBoundingClientRect();
    if (rect) {
      setMenuRelatorioPos({ top: rect.bottom + 8, left: rect.left });
    }
    setMenuRelatorioAberto((v) => !v);
  }

  useEffect(() => {
    if (!menuRelatorioAberto) return;
    function onPointerDown(e: MouseEvent) {
      const alvo = e.target as Node;
      if (
        menuRelatorioRef.current?.contains(alvo) ||
        botaoRelatorioRef.current?.contains(alvo)
      ) {
        return;
      }
      setMenuRelatorioAberto(false);
    }
    function fechar() {
      setMenuRelatorioAberto(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("scroll", fechar, true);
    window.addEventListener("resize", fechar);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("scroll", fechar, true);
      window.removeEventListener("resize", fechar);
    };
  }, [menuRelatorioAberto]);

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

  const totalListado = useMemo(
    () => filtrados.reduce((s, i) => s + calcularTotalAReceber(i), 0),
    [filtrados]
  );

  const temFiltroEncargos =
    filtroEncargoTipo !== "todos" || filtroEncargoStatus !== "todos";

  const temFiltrosAtivos = filtrosRecebimentosAtivos({
    filtroVinculo,
    filtroStatus,
    filtroEncargoTipo,
    filtroEncargoStatus,
    periodo,
    periodoSaida,
    buscaCte,
  });

  const chipsFiltro: string[] = [];
  if (filtroVinculo !== "todos") chipsFiltro.push(vinculoLabel);
  if (filtroStatus !== "todos") {
    chipsFiltro.push(
      filtroStatus === "sem_data"
        ? "Sem data"
        : RECEBIMENTO_STATUS_LABEL[filtroStatus as RecebimentoStatus]
    );
  }
  if (filtroEncargoTipo !== "todos") {
    chipsFiltro.push(`Encargo: ${RECEBIMENTO_ENCARGO_LABEL[filtroEncargoTipo]}`);
  }
  if (filtroEncargoStatus !== "todos") {
    chipsFiltro.push(RECEBIMENTO_ENCARGO_STATUS_LABEL[filtroEncargoStatus]);
  }
  if (buscaCte.trim()) chipsFiltro.push(`CT-e: ${buscaCte.trim()}`);
  if (periodo.preset !== "todos") chipsFiltro.push(labelPeriodoConfig(periodo));
  if (periodoSaida.preset !== "todos") {
    chipsFiltro.push(`Saída: ${labelPeriodoConfig(periodoSaida)}`);
  }

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
        <div className="flex shrink-0 flex-wrap gap-2">
          <div className="relative">
            <Button
              ref={botaoRelatorioRef}
              type="button"
              variant="secondary"
              onClick={abrirMenuRelatorio}
              aria-expanded={menuRelatorioAberto}
              aria-haspopup="menu"
            >
              <FileBarChart className="h-4 w-4" />
              Gerar relatório
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition",
                  menuRelatorioAberto && "rotate-180"
                )}
              />
            </Button>
            {menuRelatorioAberto &&
              createPortal(
                <div
                  ref={menuRelatorioRef}
                  role="menu"
                  className="fixed z-[80] w-72 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl"
                  style={{ top: menuRelatorioPos.top, left: menuRelatorioPos.left }}
                >
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full flex-col items-start gap-0.5 px-4 py-2.5 text-left transition hover:bg-slate-50"
                    onClick={() => {
                      setMenuRelatorioAberto(false);
                      setShowRelatorioViagens(true);
                    }}
                  >
                    <span className="text-sm font-semibold text-slate-900">
                      Relatório por saída
                    </span>
                    <span className="text-xs text-slate-500">
                      Viagens filtradas pela data de saída
                    </span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full flex-col items-start gap-0.5 px-4 py-2.5 text-left transition hover:bg-slate-50"
                    onClick={() => {
                      setMenuRelatorioAberto(false);
                      setModoRelatorio("recebimentos");
                      setShowRelatorio(true);
                    }}
                  >
                    <span className="text-sm font-semibold text-slate-900">
                      Relatório de recebimentos
                    </span>
                    <span className="text-xs text-slate-500">
                      Frete, encargos e status de pagamento
                    </span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="flex w-full flex-col items-start gap-0.5 px-4 py-2.5 text-left transition hover:bg-slate-50"
                    onClick={() => {
                      setMenuRelatorioAberto(false);
                      setModoRelatorio("encargos");
                      setShowRelatorio(true);
                    }}
                  >
                    <span className="text-sm font-semibold text-slate-900">
                      Relatório de encargos
                    </span>
                    <span className="text-xs text-slate-500">
                      Descargas e diárias lançadas
                    </span>
                  </button>
                </div>,
                document.body
              )}
          </div>
          <Button type="button" variant="secondary" onClick={() => load({ refresh: true })} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ResumoCard
          label="Pendente"
          valor={resumo.pendente}
          icon={Clock}
          tone="amber"
          ativo={filtroStatus === "pendente"}
          onClick={() => setFiltroStatus((s) => (s === "pendente" ? "todos" : "pendente"))}
        />
        <ResumoCard
          label="Vencido"
          valor={resumo.vencido}
          icon={AlertTriangle}
          tone="rose"
          ativo={filtroStatus === "vencido"}
          onClick={() => setFiltroStatus((s) => (s === "vencido" ? "todos" : "vencido"))}
        />
        <ResumoCard
          label="Pago"
          valor={resumo.pago}
          icon={CheckCircle2}
          tone="emerald"
          ativo={filtroStatus === "pago"}
          onClick={() => setFiltroStatus((s) => (s === "pago" ? "todos" : "pago"))}
        />
        <ResumoCard
          label="Sem datas"
          valor={resumo.semData}
          icon={CalendarOff}
          tone="slate"
          ativo={filtroStatus === "sem_data"}
          onClick={() => setFiltroStatus((s) => (s === "sem_data" ? "todos" : "sem_data"))}
        />
      </div>

      <div className={cn(mebFormSection, "space-y-4")}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
              <Filter className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-800">Filtros</p>
              <p className="text-xs text-slate-500">
                Refine a lista por período, vínculo e status
              </p>
            </div>
          </div>
          {temFiltrosAtivos && (
            <button
              type="button"
              onClick={limparFiltros}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800"
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
          <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-1 xl:col-span-1">
            <label className="text-sm font-medium text-slate-600">Buscar CT-e</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={buscaCte}
                onChange={(e) => setBuscaCte(e.target.value)}
                placeholder="Número do CT-e..."
                className="w-full rounded-lg border border-slate-200 bg-white/80 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
              />
            </div>
          </div>
        </div>

        {(periodo.preset === "custom" || periodoSaida.preset === "custom") && (
          <div className="grid gap-3 rounded-lg border border-dashed border-slate-200 bg-slate-50/70 p-3 sm:grid-cols-2 lg:grid-cols-4">
            {periodo.preset === "custom" && (
              <>
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
              </>
            )}
            {periodoSaida.preset === "custom" && (
              <>
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
              </>
            )}
          </div>
        )}

        <details
          className={cn(
            "group overflow-hidden rounded-xl border bg-white/80 shadow-sm transition",
            temFiltroEncargos
              ? "border-cyan-200 ring-1 ring-cyan-100"
              : "border-slate-200/80"
          )}
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 marker:content-none [&::-webkit-details-marker]:hidden">
            <span className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                <SlidersHorizontal className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-slate-800">
                  Filtros de encargos
                </span>
                <span className="block text-xs text-slate-500">
                  Opcional · descarga e diária
                </span>
              </span>
              {temFiltroEncargos && (
                <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-[11px] font-medium text-cyan-800">
                  Ativo
                </span>
              )}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition group-open:rotate-180" />
          </summary>
          <div className="grid gap-3 border-t border-slate-100 bg-slate-50/50 px-4 py-3 sm:grid-cols-2">
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

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/80 pt-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-slate-700">
              {filtrados.length} registro{filtrados.length === 1 ? "" : "s"}
            </span>
            {chipsFiltro.map((chip) => (
              <span
                key={chip}
                className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-slate-600"
              >
                {chip}
              </span>
            ))}
          </div>
          <p className="text-sm text-slate-500">
            Total listado{" "}
            <span className="font-semibold tabular-nums text-slate-800">
              {formatarMoeda(totalListado)}
            </span>
          </p>
        </div>
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

const RESUMO_TONES = {
  amber: {
    accent: "border-l-amber-500",
    iconWrap: "bg-amber-100",
    icon: "text-amber-600",
    value: "text-amber-800",
    active: "border-amber-300 bg-amber-50/70 ring-1 ring-amber-200",
    hover: "hover:border-amber-200 hover:shadow-md hover:shadow-amber-100/50",
  },
  rose: {
    accent: "border-l-rose-500",
    iconWrap: "bg-rose-100",
    icon: "text-rose-600",
    value: "text-rose-700",
    active: "border-rose-300 bg-rose-50/70 ring-1 ring-rose-200",
    hover: "hover:border-rose-200 hover:shadow-md hover:shadow-rose-100/50",
  },
  emerald: {
    accent: "border-l-emerald-500",
    iconWrap: "bg-emerald-100",
    icon: "text-emerald-600",
    value: "text-emerald-700",
    active: "border-emerald-300 bg-emerald-50/70 ring-1 ring-emerald-200",
    hover: "hover:border-emerald-200 hover:shadow-md hover:shadow-emerald-100/50",
  },
  slate: {
    accent: "border-l-slate-400",
    iconWrap: "bg-slate-100",
    icon: "text-slate-600",
    value: "text-slate-800",
    active: "border-slate-300 bg-slate-50 ring-1 ring-slate-200",
    hover: "hover:border-slate-300 hover:shadow-md hover:shadow-slate-100/50",
  },
} as const;

function ResumoCard({
  label,
  valor,
  icon: Icon,
  tone,
  ativo,
  onClick,
}: {
  label: string;
  valor: number;
  icon: LucideIcon;
  tone: keyof typeof RESUMO_TONES;
  ativo?: boolean;
  onClick?: () => void;
}) {
  const style = RESUMO_TONES[tone];
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      title={onClick ? (ativo ? "Clique para limpar o filtro" : "Clique para filtrar") : undefined}
      className={cn(
        mebCard,
        "border-l-4 bg-white/90 p-4 text-left shadow-sm transition",
        style.accent,
        onClick && cn("cursor-pointer hover:-translate-y-0.5", style.hover),
        ativo && style.active
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            style.iconWrap
          )}
        >
          <Icon className={cn("h-5 w-5", style.icon)} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p
            className={cn(
              "mt-0.5 truncate text-xl font-bold tracking-tight tabular-nums",
              style.value
            )}
          >
            {formatarMoeda(valor)}
          </p>
          {onClick && (
            <p className="mt-1 text-[11px] text-slate-400">
              {ativo ? "Filtro ativo · clique para limpar" : "Clique para filtrar"}
            </p>
          )}
        </div>
      </div>
    </Tag>
  );
}
