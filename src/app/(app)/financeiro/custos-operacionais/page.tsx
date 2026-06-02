"use client";

import { useCallback, useEffect, useState, type ComponentType } from "react";
import { Truck, Fuel, Wrench, Route, Receipt, Droplets } from "lucide-react";
import { PeriodoFilter } from "@/components/frota/periodo-filter";
import { fetchCustosOperacionais, type CustosOperacionaisResumo } from "@/lib/custos-operacionais";
import { formatarMoeda, PERIODOS, type PeriodoFiltro } from "@/lib/frota-filters";

function CardCusto({
  label,
  valor,
  icon: Icon,
  sub,
}: {
  label: string;
  valor: number;
  icon: ComponentType<{ className?: string }>;
  sub?: string;
}) {
  return (
    <article className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-4">
      <div className="mb-2 flex items-center gap-2 text-slate-400">
        <Icon className="h-5 w-5 text-cyan-500" />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white">{formatarMoeda(valor)}</p>
      {sub && <p className="mt-1 text-xs text-slate-500">{sub}</p>}
    </article>
  );
}

export default function CustosOperacionaisPage() {
  const [periodo, setPeriodo] = useState<PeriodoFiltro>("mes");
  const [resumo, setResumo] = useState<CustosOperacionaisResumo | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setResumo(await fetchCustosOperacionais(periodo));
    setLoading(false);
  }, [periodo]);

  useEffect(() => {
    load();
  }, [load]);

  const periodoLabel = PERIODOS.find((p) => p.value === periodo)?.label ?? "";

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Truck className="h-8 w-8 text-cyan-400" />
          <div>
            <h1 className="text-2xl font-bold">Custos Operacionais</h1>
            <p className="text-slate-400">
              Gastos em serviços de operação · Período: {periodoLabel}
            </p>
          </div>
        </div>
        <PeriodoFilter value={periodo} onChange={setPeriodo} />
      </header>

      {loading || !resumo ? (
        <p className="text-slate-500">Carregando...</p>
      ) : (
        <>
          <article className="rounded-xl border border-cyan-700/40 bg-cyan-950/20 p-5 text-center">
            <p className="text-sm text-cyan-400/80">Total operacional no período</p>
            <p className="text-3xl font-bold text-cyan-300">{formatarMoeda(resumo.total)}</p>
          </article>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <CardCusto
              label="Abastecimentos (total)"
              valor={resumo.abastecimentos}
              icon={Fuel}
              sub={`Frota: ${formatarMoeda(resumo.abastecimentosFrota)} · Viagens: ${formatarMoeda(resumo.abastecimentosViagem)}`}
            />
            <CardCusto
              label="Manutenções (total)"
              valor={resumo.manutencoes}
              icon={Wrench}
              sub={`Preventiva: ${formatarMoeda(resumo.manutencoesPreventivas)} · Em viagem: ${formatarMoeda(resumo.manutencoesViagem)}`}
            />
            <CardCusto label="Pedágios (viagens)" valor={resumo.pedagios} icon={Route} />
            <CardCusto
              label="Reembolsos (viagens)"
              valor={resumo.reembolsos}
              icon={Receipt}
              sub="Não entra no total operacional"
            />
            <CardCusto label="Arla (viagens)" valor={resumo.arla} icon={Droplets} />
          </div>
        </>
      )}
    </div>
  );
}
