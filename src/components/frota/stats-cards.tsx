import {
  Banknote,
  Droplets,
  Fuel,
  Gauge,
  Route,
  Shield,
  Truck,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { formatarMoeda } from "@/lib/frota-filters";
import { formatKmBr } from "@/lib/number-format";
import { categoriaControleCombustivel } from "@/lib/combustivel-consumo";
import { cn, mebCard, mebCardSm } from "@/lib/utils";

type StatTone = "cyan" | "emerald" | "amber" | "sky" | "violet" | "slate";

type Stat = {
  label: string;
  value: string | number;
  sub?: string;
  icon?: LucideIcon;
  tone?: StatTone;
};

const TONE_STYLES: Record<
  StatTone,
  { accent: string; iconWrap: string; icon: string }
> = {
  cyan: {
    accent: "border-l-cyan-500",
    iconWrap: "bg-cyan-100",
    icon: "text-cyan-600",
  },
  emerald: {
    accent: "border-l-emerald-500",
    iconWrap: "bg-emerald-100",
    icon: "text-emerald-600",
  },
  amber: {
    accent: "border-l-amber-500",
    iconWrap: "bg-amber-100",
    icon: "text-amber-600",
  },
  sky: {
    accent: "border-l-sky-500",
    iconWrap: "bg-sky-100",
    icon: "text-sky-600",
  },
  violet: {
    accent: "border-l-violet-500",
    iconWrap: "bg-violet-100",
    icon: "text-violet-600",
  },
  slate: {
    accent: "border-l-slate-400",
    iconWrap: "bg-slate-100",
    icon: "text-slate-600",
  },
};

const TONE_CYCLE: StatTone[] = ["cyan", "emerald", "amber", "sky", "violet", "slate"];

const DEFAULT_ICONS: LucideIcon[] = [Wrench, Banknote, Shield, Route, Fuel, Gauge];

export function StatsCards({
  stats,
  compact,
}: {
  stats: Stat[];
  compact?: boolean;
}) {
  return (
    <div
      className={
        compact
          ? "grid gap-2 sm:grid-cols-2 lg:grid-cols-4"
          : "grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      }
    >
      {stats.map((s, i) => {
        const tone = s.tone ?? TONE_CYCLE[i % TONE_CYCLE.length]!;
        const style = TONE_STYLES[tone];
        const Icon = s.icon ?? DEFAULT_ICONS[i % DEFAULT_ICONS.length]!;

        return (
          <div
            key={s.label}
            className={cn(
              compact ? mebCardSm : mebCard,
              "border-l-4 bg-white/90 shadow-sm",
              style.accent,
              compact ? "p-3" : "p-4"
            )}
          >
            <div className="flex items-start gap-3">
              <div
                className={cn(
                  "flex shrink-0 items-center justify-center rounded-xl",
                  style.iconWrap,
                  compact ? "h-8 w-8" : "h-10 w-10"
                )}
              >
                <Icon className={cn(style.icon, compact ? "h-4 w-4" : "h-5 w-5")} />
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "font-medium uppercase tracking-wide text-slate-500",
                    compact ? "text-[10px]" : "text-xs"
                  )}
                >
                  {s.label}
                </p>
                <p
                  className={cn(
                    "mt-0.5 font-bold tracking-tight text-slate-900",
                    compact ? "text-lg" : "text-2xl"
                  )}
                >
                  {s.value}
                </p>
                {s.sub && (
                  <p
                    className={cn(
                      "mt-0.5 truncate text-slate-500",
                      compact ? "text-[10px]" : "text-xs"
                    )}
                    title={s.sub}
                  >
                    {s.sub}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function buildManutencaoStats(
  items: { valor: number; source: string; status: string }[],
  periodoLabel: string
) {
  const total = items.length;
  const valor = items.reduce((s, i) => s + i.valor, 0);
  const preventivas = items.filter((i) => i.source === "preventiva").length;
  const viagem = items.filter((i) => i.source === "viagem").length;
  const finalizadas = items.filter((i) => i.status === "FINALIZADO").length;

  return [
    { label: "Manutenções", value: total, sub: periodoLabel, icon: Wrench, tone: "cyan" as const },
    {
      label: "Valor gasto",
      value: formatarMoeda(valor),
      sub: periodoLabel,
      icon: Banknote,
      tone: "emerald" as const,
    },
    {
      label: "Preventivas",
      value: preventivas,
      sub: "Cadastro frota",
      icon: Shield,
      tone: "amber" as const,
    },
    {
      label: "De viagens",
      value: viagem,
      sub: `${finalizadas} finalizadas`,
      icon: Truck,
      tone: "sky" as const,
    },
  ];
}

export function buildAbastecimentoStats(
  items: {
    valor: number;
    valorBruto?: number;
    desconto?: number;
    source: string;
    km?: number | null;
  }[],
  periodoLabel: string
) {
  const total = items.length;
  const valorLiquido = items.reduce((s, i) => s + i.valor, 0);
  const valorBruto = items.reduce((s, i) => s + (i.valorBruto ?? i.valor), 0);
  const descontoTotal = items.reduce((s, i) => s + (i.desconto ?? 0), 0);
  const km = items.reduce((s, i) => s + (i.km ?? 0), 0);
  const viagem = items.filter((i) => i.source === "viagem").length;

  const valorSub =
    descontoTotal > 0
      ? `Bruto ${formatarMoeda(valorBruto)} − Desconto ${formatarMoeda(descontoTotal)}`
      : periodoLabel;

  return [
    {
      label: "Abastecimentos",
      value: total,
      sub: periodoLabel,
      icon: Fuel,
      tone: "cyan" as const,
    },
    {
      label: "Valor total (líquido)",
      value: formatarMoeda(valorLiquido),
      sub: valorSub,
      icon: Banknote,
      tone: "emerald" as const,
    },
    {
      label: "KM registrados",
      value: formatKmBr(km),
      sub: "Soma dos lançamentos",
      icon: Gauge,
      tone: "amber" as const,
    },
    {
      label: "De viagens",
      value: viagem,
      sub: "Acompanhamento",
      icon: Route,
      tone: "sky" as const,
    },
  ];
}

export function buildAbastecimentoControleStats(
  items: { valor: number; combustivelTipo?: string | null }[],
  periodoLabel: string
) {
  let arla = 0;
  let dieselComum = 0;
  let dieselS500 = 0;

  for (const i of items) {
    const cat = categoriaControleCombustivel(i.combustivelTipo);
    if (cat === "arla") arla += i.valor;
    else if (cat === "diesel_comum") dieselComum += i.valor;
    else if (cat === "diesel_s500") dieselS500 += i.valor;
  }

  return [
    {
      label: "Arla",
      value: formatarMoeda(arla),
      sub: `${periodoLabel} · fora do consumo KM/L`,
      icon: Droplets,
      tone: "sky" as const,
    },
    {
      label: "Diesel Comum",
      value: formatarMoeda(dieselComum),
      sub: `${periodoLabel} · fora do consumo KM/L`,
      icon: Fuel,
      tone: "amber" as const,
    },
    {
      label: "Diesel S500",
      value: formatarMoeda(dieselS500),
      sub: `${periodoLabel} · fora do consumo KM/L`,
      icon: Fuel,
      tone: "violet" as const,
    },
  ];
}
