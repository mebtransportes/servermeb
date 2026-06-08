"use client";

import { useCallback, useEffect, useState, type ComponentType } from "react";
import { Truck, Fuel, Wrench, Route, Receipt, Droplets, ParkingCircle } from "lucide-react";
import { PeriodoFilter } from "@/components/frota/periodo-filter";
import { CustosOperacionaisDetalheModal } from "@/components/financeiro/custos-operacionais-detalhe-modal";
import {
  fetchCustosOperacionais,
  type CustoOperacionalCategoria,
  type CustosOperacionaisResumo,
} from "@/lib/custos-operacionais";
import {
  formatarMoeda,
  labelPeriodoConfig,
  PERIODO_FILTRO_INICIAL,
  type PeriodoFiltroState,
} from "@/lib/frota-filters";
import { cn } from "@/lib/utils";

function CardCusto({
  label,
  valor,
  icon: Icon,
  sub,
  onClick,
}: {
  label: string;
  valor: number;
  icon: ComponentType<{ className?: string }>;
  sub?: string;
  onClick?: () => void;
}) {
  const Tag = onClick ? "button" : "article";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "rounded-lg border border-slate-700/50 bg-slate-800/30 p-3 text-left transition",
        onClick && "cursor-pointer hover:border-cyan-600/50 hover:bg-slate-800/60"
      )}
    >
      <div className="mb-1 flex items-center gap-2 text-slate-400">
        <Icon className="h-4 w-4 text-cyan-500" />
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="text-lg font-bold text-white">{formatarMoeda(valor)}</p>
      {sub && <p className="mt-0.5 text-[10px] text-slate-500">{sub}</p>}
      {onClick && (
        <p className="mt-1 text-[10px] text-cyan-500/80">Clique para ver detalhes</p>
      )}
    </Tag>
  );
}

export default function CustosOperacionaisPage() {
  const [periodo, setPeriodo] = useState<PeriodoFiltroState>(PERIODO_FILTRO_INICIAL);
  const [resumo, setResumo] = useState<CustosOperacionaisResumo | null>(null);
  const [loading, setLoading] = useState(true);
  const [detalheCategoria, setDetalheCategoria] =
    useState<CustoOperacionalCategoria | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setResumo(await fetchCustosOperacionais(periodo));
    setLoading(false);
  }, [periodo]);

  useEffect(() => {
    load();
  }, [load]);

  const periodoLabel = labelPeriodoConfig(periodo);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Truck className="h-8 w-8 text-cyan-400" />
          <div>
            <h1 className="text-2xl font-bold">Custos Operacionais</h1>
            <p className="text-sm text-slate-400">
              Gastos em serviços de operação · {periodoLabel}
            </p>
          </div>
        </div>
        <PeriodoFilter value={periodo} onChange={setPeriodo} />
      </header>

      {loading || !resumo ? (
        <p className="text-slate-500">Carregando...</p>
      ) : (
        <>
          <article className="rounded-lg border border-cyan-700/40 bg-cyan-950/20 p-4 text-center">
            <p className="text-xs text-cyan-400/80">Total operacional no período</p>
            <p className="text-2xl font-bold text-cyan-300">{formatarMoeda(resumo.total)}</p>
          </article>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <CardCusto
              label="Abastecimentos"
              valor={resumo.abastecimentos}
              icon={Fuel}
              sub={`Frota ${formatarMoeda(resumo.abastecimentosFrota)} · Viagem ${formatarMoeda(resumo.abastecimentosViagem)}`}
              onClick={() => setDetalheCategoria("abastecimentos")}
            />
            <CardCusto
              label="Manutenções"
              valor={resumo.manutencoes}
              icon={Wrench}
              sub={`Preventiva ${formatarMoeda(resumo.manutencoesPreventivas)} · Viagem ${formatarMoeda(resumo.manutencoesViagem)}`}
              onClick={() => setDetalheCategoria("manutencoes")}
            />
            <CardCusto
              label="Pedágios"
              valor={resumo.pedagios}
              icon={Route}
              onClick={() => setDetalheCategoria("pedagios")}
            />
            <CardCusto
              label="Reembolsos"
              valor={resumo.reembolsos}
              icon={Receipt}
              sub="Fora do total operacional"
              onClick={() => setDetalheCategoria("reembolsos")}
            />
            <CardCusto
              label="Arla"
              valor={resumo.arla}
              icon={Droplets}
              onClick={() => setDetalheCategoria("arla")}
            />
            {resumo.outros > 0 && (
              <CardCusto
                label="Outros"
                valor={resumo.outros}
                icon={ParkingCircle}
                sub="Estacionamento, seguro, monitoramento"
                onClick={() => setDetalheCategoria("outros")}
              />
            )}
          </div>
        </>
      )}

      {detalheCategoria && resumo && (
        <CustosOperacionaisDetalheModal
          categoria={detalheCategoria}
          linhas={resumo.linhas[detalheCategoria]}
          onClose={() => setDetalheCategoria(null)}
        />
      )}
    </div>
  );
}
