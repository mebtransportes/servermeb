"use client";

import { useCallback, useEffect, useState, type ComponentType } from "react";
import {
  Truck,
  Fuel,
  Wrench,
  Route,
  Receipt,
  Droplets,
  ParkingCircle,
  Landmark,
  FileBarChart,
  FlaskConical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PeriodoFilter } from "@/components/frota/periodo-filter";
import { gerarPdfCustosOperacionais } from "@/lib/custos-operacionais-pdf";
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
import { cn, mebCard, mebCardSm } from "@/lib/utils";

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
        mebCardSm,
        "p-3 text-left transition",
        onClick && "cursor-pointer hover:border-cyan-200 hover:bg-white/80"
      )}
    >
      <div className="mb-1 flex items-center gap-2 text-slate-500">
        <Icon className="h-4 w-4 text-cyan-600" />
        <span className="text-xs font-medium text-slate-600">{label}</span>
      </div>
      <p className="text-lg font-bold text-slate-900">{formatarMoeda(valor)}</p>
      {sub && <p className="mt-0.5 text-[10px] text-slate-500">{sub}</p>}
      {onClick && (
        <p className="mt-1 text-[10px] text-cyan-700">Clique para ver detalhes</p>
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
          <Truck className="h-8 w-8 text-cyan-600" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Custos Operacionais</h1>
            <p className="text-sm text-slate-500">
              Gastos em serviços de operação · {periodoLabel}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <PeriodoFilter value={periodo} onChange={setPeriodo} />
          <Button
            type="button"
            variant="secondary"
            disabled={loading || !resumo}
            onClick={() => resumo && gerarPdfCustosOperacionais(resumo, periodoLabel)}
          >
            <FileBarChart className="h-4 w-4" />
            Gerar relatório PDF
          </Button>
        </div>
      </header>

      {loading || !resumo ? (
        <p className="text-slate-500">Carregando...</p>
      ) : (
        <>
          <article className={cn(mebCard, "border-cyan-200/80 p-4 text-center")}>
            <p className="text-xs text-slate-500">Total operacional no período</p>
            <p className="text-2xl font-bold text-cyan-700">{formatarMoeda(resumo.total)}</p>
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
              sub="Controle separado · fora do consumo KM/L"
              onClick={() => setDetalheCategoria("arla")}
            />
            <CardCusto
              label="Diesel Comum"
              valor={resumo.dieselComum}
              icon={FlaskConical}
              sub="Controle separado · fora do consumo KM/L"
              onClick={() => setDetalheCategoria("diesel_comum")}
            />
            <CardCusto
              label="Diesel S500"
              valor={resumo.dieselS500}
              icon={FlaskConical}
              sub="Controle separado · fora do consumo KM/L"
              onClick={() => setDetalheCategoria("diesel_s500")}
            />
            <CardCusto
              label="ICMS"
              valor={resumo.icms}
              icon={Landmark}
              sub="Imposto sobre frete das viagens · Fora do total operacional"
              onClick={() => setDetalheCategoria("icms")}
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
