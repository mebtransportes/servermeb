"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Banknote, FileBarChart, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PeriodoFilter } from "@/components/frota/periodo-filter";
import { RecebimentoLinha } from "@/components/financeiro/recebimento-linha";
import { RecebimentosRelatorioModal } from "@/components/financeiro/recebimentos-relatorio-modal";
import { fetchRecebimentos } from "@/lib/recebimento-viagem";
import type { RecebimentoComCanhotos } from "@/lib/recebimento-viagem";
import {
  dataNoPeriodoConfig,
  formatarMoeda,
  labelPeriodoConfig,
  PERIODO_FILTRO_INICIAL,
  type PeriodoFiltroState,
} from "@/lib/frota-filters";
import { calcularTotalAReceber } from "@/types/recebimento";
import { RECEBIMENTO_STATUS_LABEL, type RecebimentoStatus } from "@/types/recebimento";
import { cn, mebCard, mebFilterActive, mebFilterInactive, mebFormSection } from "@/lib/utils";

type FiltroStatus = RecebimentoStatus | "todos";

const STATUS_FILTROS: { value: FiltroStatus; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "pendente", label: "Pendentes" },
  { value: "pago", label: "Pagos" },
  { value: "vencido", label: "Vencidos" },
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

export default function RecebimentosPage() {
  const [itens, setItens] = useState<RecebimentoComCanhotos[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>("todos");
  const [periodo, setPeriodo] = useState<PeriodoFiltroState>(PERIODO_FILTRO_INICIAL);
  const [showRelatorio, setShowRelatorio] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const lista = await fetchRecebimentos();
    setItens(lista);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const noPeriodo = useMemo(
    () => itens.filter((i) => recebimentoNoPeriodo(i, periodo)),
    [itens, periodo]
  );

  const filtrados = useMemo(() => {
    if (filtroStatus === "todos") return noPeriodo;
    return noPeriodo.filter((i) => i.status === filtroStatus);
  }, [noPeriodo, filtroStatus]);

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
            aqui automaticamente. Controle valores a receber da empresa contratante.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => setShowRelatorio(true)}>
            <FileBarChart className="mr-2 h-4 w-4" />
            Gerar relatório
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
          <p className="mb-2 text-xs font-medium text-slate-500">
            Período (data para recebimento)
          </p>
          <PeriodoFilter value={periodo} onChange={setPeriodo} />
        </div>

        <p className="text-sm text-slate-500">
          {filtrados.length} registro(s)
          {filtroStatus !== "todos" && (
            <> · {RECEBIMENTO_STATUS_LABEL[filtroStatus as RecebimentoStatus]}</>
          )}
          {periodo.preset !== "todos" && <> · {labelPeriodoConfig(periodo)}</>}
          {" · "}
          total listado{" "}
          {formatarMoeda(
            filtrados.reduce((s, i) => s + calcularTotalAReceber(i), 0)
          )}
        </p>
      </div>

      {loading ? (
        <p className="text-slate-400">Carregando...</p>
      ) : filtrados.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 p-8 text-center">
          <p className="text-slate-500">
            Nenhum recebimento encontrado. Arquive viagens no Acompanhamento para que apareçam
            aqui.
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
        itens={itens}
        open={showRelatorio}
        onClose={() => setShowRelatorio(false)}
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
      {onClick && (
        <p className="mt-1 text-[10px] text-slate-400">Clique para filtrar</p>
      )}
    </Tag>
  );
}
