"use client";

import { useCallback, useEffect, useState, type ComponentType, type ReactNode } from "react";
import {
  ChevronRight,
  Droplets,
  FileBarChart,
  FlaskConical,
  Fuel,
  Landmark,
  ParkingCircle,
  Receipt,
  Route,
  Truck,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PeriodoFilter } from "@/components/frota/periodo-filter";
import { gerarPdfCustosOperacionais } from "@/lib/custos-operacionais-pdf";
import { CustosOperacionaisDetalheModal } from "@/components/financeiro/custos-operacionais-detalhe-modal";
import { CustosPostosModal } from "@/components/financeiro/custos-postos-modal";
import {
  fetchCustosOperacionais,
  fetchCustosPostos,
  type CustoOperacionalCategoria,
  type CustosPostosResumo,
  type CustosOperacionaisResumo,
} from "@/lib/custos-operacionais";
import {
  formatarMoeda,
  labelPeriodoConfig,
  PERIODO_FILTRO_INICIAL,
  type PeriodoFiltroState,
} from "@/lib/frota-filters";
import { cn, mebCard } from "@/lib/utils";

type Tone = "sky" | "amber" | "violet" | "emerald" | "cyan" | "orange" | "slate" | "rose";

const TONES: Record<
  Tone,
  { accent: string; iconWrap: string; icon: string; hover: string }
> = {
  sky: {
    accent: "border-l-sky-500",
    iconWrap: "bg-sky-100",
    icon: "text-sky-600",
    hover: "hover:border-sky-200 hover:shadow-sky-100/50",
  },
  amber: {
    accent: "border-l-amber-500",
    iconWrap: "bg-amber-100",
    icon: "text-amber-600",
    hover: "hover:border-amber-200 hover:shadow-amber-100/50",
  },
  violet: {
    accent: "border-l-violet-500",
    iconWrap: "bg-violet-100",
    icon: "text-violet-600",
    hover: "hover:border-violet-200 hover:shadow-violet-100/50",
  },
  emerald: {
    accent: "border-l-emerald-500",
    iconWrap: "bg-emerald-100",
    icon: "text-emerald-600",
    hover: "hover:border-emerald-200 hover:shadow-emerald-100/50",
  },
  cyan: {
    accent: "border-l-cyan-500",
    iconWrap: "bg-cyan-100",
    icon: "text-cyan-600",
    hover: "hover:border-cyan-200 hover:shadow-cyan-100/50",
  },
  orange: {
    accent: "border-l-orange-500",
    iconWrap: "bg-orange-100",
    icon: "text-orange-600",
    hover: "hover:border-orange-200 hover:shadow-orange-100/50",
  },
  slate: {
    accent: "border-l-slate-400",
    iconWrap: "bg-slate-100",
    icon: "text-slate-600",
    hover: "hover:border-slate-300 hover:shadow-slate-100/50",
  },
  rose: {
    accent: "border-l-rose-500",
    iconWrap: "bg-rose-100",
    icon: "text-rose-600",
    hover: "hover:border-rose-200 hover:shadow-rose-100/50",
  },
};

function CardCusto({
  label,
  valor,
  icon: Icon,
  sub,
  tone,
  qtd,
  onClick,
}: {
  label: string;
  valor: number;
  icon: ComponentType<{ className?: string }>;
  sub?: string;
  tone: Tone;
  qtd?: number;
  onClick?: () => void;
}) {
  const style = TONES[tone];
  const Tag = onClick ? "button" : "article";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        mebCard,
        "border-l-4 bg-white/90 p-4 text-left shadow-sm transition",
        style.accent,
        onClick &&
          cn(
            "cursor-pointer hover:-translate-y-0.5 hover:bg-white hover:shadow-md",
            style.hover
          )
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
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              {label}
            </p>
            {typeof qtd === "number" && (
              <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                {qtd}
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-xl font-bold tracking-tight tabular-nums text-slate-900">
            {formatarMoeda(valor)}
          </p>
          {sub && <p className="mt-1 text-[11px] leading-snug text-slate-500">{sub}</p>}
          {onClick && (
            <span className="mt-2 inline-flex items-center gap-0.5 text-[11px] font-medium text-slate-500">
              Ver detalhes
              <ChevronRight className="h-3.5 w-3.5" />
            </span>
          )}
        </div>
      </div>
    </Tag>
  );
}

function Secao({
  titulo,
  descricao,
  children,
}: {
  titulo: string;
  descricao?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-slate-800">{titulo}</h2>
        {descricao && <p className="text-xs text-slate-500">{descricao}</p>}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{children}</div>
    </section>
  );
}

export default function CustosOperacionaisPage() {
  const [periodo, setPeriodo] = useState<PeriodoFiltroState>(PERIODO_FILTRO_INICIAL);
  const [resumo, setResumo] = useState<CustosOperacionaisResumo | null>(null);
  const [loading, setLoading] = useState(true);
  const [detalheCategoria, setDetalheCategoria] =
    useState<CustoOperacionalCategoria | null>(null);
  const [custosPostos, setCustosPostos] = useState<CustosPostosResumo | null>(null);
  const [loadingPostos, setLoadingPostos] = useState(true);
  const [mostrarCustosPostos, setMostrarCustosPostos] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadingPostos(true);
    const [custos, postos] = await Promise.all([
      fetchCustosOperacionais(periodo),
      fetchCustosPostos(periodo),
    ]);
    setResumo(custos);
    setCustosPostos(postos);
    setLoading(false);
    setLoadingPostos(false);
  }, [periodo]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const periodoLabel = labelPeriodoConfig(periodo);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#33388d]/10 text-[#33388d]">
            <Truck className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Custos Operacionais
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
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
        <div className={cn(mebCard, "p-10 text-center text-sm text-slate-500")}>
          Carregando custos do período...
        </div>
      ) : (
        <>
          <section className="relative overflow-hidden rounded-2xl bg-[#33388d] px-6 py-6 text-white shadow-sm">
            <div className="pointer-events-none absolute -right-12 top-0 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-16 left-1/3 h-32 w-32 rounded-full bg-sky-300/20 blur-2xl" />
            <div className="relative flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/65">
                  Total operacional
                </p>
                <p className="mt-1 text-3xl font-bold tracking-tight tabular-nums">
                  {formatarMoeda(resumo.total)}
                </p>
                <p className="mt-1 text-sm text-white/70">{periodoLabel}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <MiniStat
                  label="Abastecimentos"
                  value={formatarMoeda(resumo.abastecimentos)}
                />
                <MiniStat
                  label="Manutenções"
                  value={formatarMoeda(resumo.manutencoes)}
                />
                <MiniStat
                  label="Pedágios"
                  value={formatarMoeda(resumo.pedagios)}
                  className="col-span-2 sm:col-span-1"
                />
              </div>
            </div>
          </section>

          <Secao
            titulo="No total operacional"
            descricao="Entram no somatório principal do período"
          >
            <CardCusto
              label="Abastecimentos"
              valor={resumo.abastecimentos}
              icon={Fuel}
              tone="sky"
              qtd={resumo.linhas.abastecimentos.length}
              sub={`Frota ${formatarMoeda(resumo.abastecimentosFrota)} · Viagem ${formatarMoeda(resumo.abastecimentosViagem)}`}
              onClick={() => setDetalheCategoria("abastecimentos")}
            />
            <CardCusto
              label="Manutenções"
              valor={resumo.manutencoes}
              icon={Wrench}
              tone="amber"
              qtd={resumo.linhas.manutencoes.length}
              sub={`Preventiva ${formatarMoeda(resumo.manutencoesPreventivas)} · Viagem ${formatarMoeda(resumo.manutencoesViagem)}`}
              onClick={() => setDetalheCategoria("manutencoes")}
            />
            <CardCusto
              label="Pedágios"
              valor={resumo.pedagios}
              icon={Route}
              tone="violet"
              qtd={resumo.linhas.pedagios.length}
              onClick={() => setDetalheCategoria("pedagios")}
            />
            {resumo.outros > 0 && (
              <CardCusto
                label="Outros"
                valor={resumo.outros}
                icon={ParkingCircle}
                tone="slate"
                qtd={resumo.linhas.outros.length}
                sub="Estacionamento, seguro, monitoramento"
                onClick={() => setDetalheCategoria("outros")}
              />
            )}
          </Secao>

          <Secao
            titulo="Detalhamento do combustível"
            descricao="Consulte os gastos agrupados por posto, sem duplicar o total operacional"
          >
            <CardCusto
              label="Custos de Postos"
              valor={custosPostos?.total ?? 0}
              icon={Fuel}
              tone="cyan"
              qtd={custosPostos?.postos.length ?? 0}
              sub={
                loadingPostos
                  ? "Carregando postos..."
                  : `${custosPostos?.litros.toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                    })} L · ${custosPostos?.postos.length ?? 0} posto(s)`
              }
              onClick={() => {
                setDetalheCategoria(null);
                setMostrarCustosPostos(true);
              }}
            />
          </Secao>

          <Secao
            titulo="Controle de combustível"
            descricao="Entram no total, mas ficam fora do consumo KM/L"
          >
            <CardCusto
              label="Arla"
              valor={resumo.arla}
              icon={Droplets}
              tone="cyan"
              qtd={resumo.linhas.arla.length}
              sub="Controle separado · fora do consumo KM/L"
              onClick={() => setDetalheCategoria("arla")}
            />
            <CardCusto
              label="Diesel Comum"
              valor={resumo.dieselComum}
              icon={FlaskConical}
              tone="orange"
              qtd={resumo.linhas.diesel_comum.length}
              sub="Controle separado · fora do consumo KM/L"
              onClick={() => setDetalheCategoria("diesel_comum")}
            />
            <CardCusto
              label="Diesel S500"
              valor={resumo.dieselS500}
              icon={FlaskConical}
              tone="amber"
              qtd={resumo.linhas.diesel_s500.length}
              sub="Controle separado · fora do consumo KM/L"
              onClick={() => setDetalheCategoria("diesel_s500")}
            />
          </Secao>

          <Secao
            titulo="Fora do total operacional"
            descricao="Acompanhe à parte — não somam no total do período"
          >
            <CardCusto
              label="Reembolsos"
              valor={resumo.reembolsos}
              icon={Receipt}
              tone="emerald"
              qtd={resumo.linhas.reembolsos.length}
              sub="Fora do total operacional"
              onClick={() => setDetalheCategoria("reembolsos")}
            />
            <CardCusto
              label="ICMS"
              valor={resumo.icms}
              icon={Landmark}
              tone="rose"
              qtd={resumo.linhas.icms.length}
              sub="Imposto sobre frete das viagens"
              onClick={() => setDetalheCategoria("icms")}
            />
          </Secao>
        </>
      )}

      {detalheCategoria && resumo && (
        <CustosOperacionaisDetalheModal
          categoria={detalheCategoria}
          linhas={resumo.linhas[detalheCategoria]}
          onClose={() => setDetalheCategoria(null)}
        />
      )}
      {mostrarCustosPostos && custosPostos && (
        <CustosPostosModal
          resumo={custosPostos}
          periodoLabel={periodoLabel}
          loading={loadingPostos}
          onClose={() => setMostrarCustosPostos(false)}
        />
      )}
    </div>
  );
}

function MiniStat({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-white/20 bg-white/10 px-3 py-2 backdrop-blur-sm",
        className
      )}
    >
      <p className="text-[10px] font-medium uppercase tracking-wide text-white/65">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums">{value}</p>
    </div>
  );
}
