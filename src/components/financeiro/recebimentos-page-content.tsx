"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Banknote, FileBarChart, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PeriodoFilter } from "@/components/frota/periodo-filter";
import { RecebimentoLinha } from "@/components/financeiro/recebimento-linha";
import { RecebimentosRelatorioModal } from "@/components/financeiro/recebimentos-relatorio-modal";
import { fetchRecebimentos, type RecebimentoComCanhotos } from "@/lib/recebimento-viagem";
import {
  dataNoPeriodoConfig,
  formatarMoeda,
  labelPeriodoConfig,
  PERIODO_FILTRO_INICIAL,
  type PeriodoFiltroState,
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
import { cn, mebCard, mebFilterActive, mebFilterInactive, mebFormSection } from "@/lib/utils";
import type { RecursoVinculo } from "@/types";

type FiltroStatus = RecebimentoStatus | "todos";
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
  { value: "pendente", label: "Pendentes" },
  { value: "pago", label: "Pagos" },
  { value: "vencido", label: "Vencidos" },
];

const VINCULO_FILTROS: { value: FiltroVinculo; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "frota", label: "Frota" },
  { value: "terceiro", label: "Terceiros" },
];

function dataReferenciaRecebimento(item: RecebimentoComCanhotos): string {
  return item.data_recebimento ?? item.created_at ?? "";
}

function recebimentoNoPeriodo(
  item: RecebimentoComCanhotos,
  periodo: PeriodoFiltroState
): boolean {
  const dataRef = dataReferenciaRecebimento(item);
  if (!dataRef) return periodo.preset === "todos";
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

export function RecebimentosPageContent() {
  const [itens, setItens] = useState<RecebimentoComCanhotos[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroVinculo, setFiltroVinculo] = useState<FiltroVinculo>("todos");
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>("todos");
  const [filtroEncargoTipo, setFiltroEncargoTipo] = useState<FiltroEncargoTipo>("todos");
  const [filtroEncargoStatus, setFiltroEncargoStatus] = useState<FiltroEncargoStatus>("todos");
  const [periodo, setPeriodo] = useState<PeriodoFiltroState>(PERIODO_FILTRO_INICIAL);
  const [showRelatorio, setShowRelatorio] = useState(false);
  const [modoRelatorio, setModoRelatorio] = useState<"recebimentos" | "encargos">("recebimentos");
  const [buscaCte, setBuscaCte] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
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
    () => porVinculo.filter((i) => recebimentoNoPeriodo(i, periodo)),
    [porVinculo, periodo]
  );

  const filtrados = useMemo(() => {
    let lista = noPeriodo;
    if (filtroStatus !== "todos") {
      lista = lista.filter((i) => i.status === filtroStatus);
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
    for (const i of noPeriodo) {
      const t = calcularTotalAReceber(i);
      if (i.status === "pago") pago += t;
      else if (i.status === "vencido") vencido += t;
      else pendente += t;
    }
    return { pendente, pago, vencido, total: pendente + pago + vencido };
  }, [noPeriodo]);

  const vinculoLabel = VINCULO_FILTROS.find((v) => v.value === filtroVinculo)?.label ?? "Todos";

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
          <Button type="button" variant="secondary" onClick={load} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
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
      </div>

      <div className={cn(mebFormSection, "space-y-4")}>
        <div>
          <p className="mb-2 text-xs font-medium text-slate-500">Vínculo</p>
          <div className="flex flex-wrap gap-2">
            {VINCULO_FILTROS.map((v) => (
              <button
                key={v.value}
                type="button"
                onClick={() => setFiltroVinculo(v.value)}
                className={cn(
                  "rounded-lg px-3.5 py-2 text-sm font-medium transition",
                  filtroVinculo === v.value ? mebFilterActive : mebFilterInactive
                )}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-slate-500">Status do pagamento</p>
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTROS.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setFiltroStatus(s.value)}
                className={cn(
                  "rounded-lg px-3.5 py-2 text-sm font-medium transition",
                  filtroStatus === s.value ? mebFilterActive : mebFilterInactive
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-slate-500">Tipo de encargo</p>
          <div className="flex flex-wrap gap-2">
            {ENCARGO_TIPO_FILTROS.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setFiltroEncargoTipo(t.value)}
                className={cn(
                  "rounded-lg px-3.5 py-2 text-sm font-medium transition",
                  filtroEncargoTipo === t.value ? mebFilterActive : mebFilterInactive
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-slate-500">Status dos encargos</p>
          <div className="flex flex-wrap gap-2">
            {ENCARGO_STATUS_FILTROS.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setFiltroEncargoStatus(s.value)}
                className={cn(
                  "rounded-lg px-3.5 py-2 text-sm font-medium transition",
                  filtroEncargoStatus === s.value ? mebFilterActive : mebFilterInactive
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-slate-500">
            Buscar por CT-e (viagem ou encargo)
          </p>
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              type="search"
              value={buscaCte}
              onChange={(e) => setBuscaCte(e.target.value)}
              placeholder="Digite o número do CT-e..."
              className="pl-9"
            />
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-slate-500">
            Período (data para recebimento)
          </p>
          <PeriodoFilter value={periodo} onChange={setPeriodo} />
        </div>

        <p className="text-sm text-slate-500">
          {filtrados.length} registro(s)
          {filtroVinculo !== "todos" && <> · {vinculoLabel}</>}
          {filtroStatus !== "todos" && (
            <> · {RECEBIMENTO_STATUS_LABEL[filtroStatus as RecebimentoStatus]}</>
          )}
          {filtroEncargoTipo !== "todos" && (
            <> · Encargo: {RECEBIMENTO_ENCARGO_LABEL[filtroEncargoTipo]}</>
          )}
          {filtroEncargoStatus !== "todos" && (
            <> · Encargo {RECEBIMENTO_ENCARGO_STATUS_LABEL[filtroEncargoStatus]}</>
          )}
          {buscaCte.trim() && <> · CT-e: {buscaCte.trim()}</>}
          {periodo.preset !== "todos" && <> · {labelPeriodoConfig(periodo)}</>}
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
            <RecebimentoLinha key={item.id} item={item} onAtualizado={load} />
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
