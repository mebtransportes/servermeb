import { formatarMoeda } from "@/lib/frota-filters";
import { formatKmBr } from "@/lib/number-format";
import { categoriaControleCombustivel } from "@/lib/combustivel-consumo";
import { cn, mebCard, mebCardSm } from "@/lib/utils";

type Stat = { label: string; value: string | number; sub?: string };

export function StatsCards({
  stats,
  compact,
}: {
  stats: Stat[];
  compact?: boolean;
}) {
  return (
    <div className={compact ? "grid gap-2 sm:grid-cols-2 lg:grid-cols-4" : "grid gap-4 sm:grid-cols-2 lg:grid-cols-4"}>
      {stats.map((s) => (
        <div
          key={s.label}
          className={cn(compact ? cn(mebCardSm, "p-2.5") : cn(mebCard, "p-4"))}
        >
          <p className={compact ? "text-[10px] text-slate-500" : "text-sm text-slate-500"}>
            {s.label}
          </p>
          <p className={compact ? "mt-0.5 text-lg font-bold text-slate-900" : "mt-1 text-2xl font-bold text-slate-900"}>
            {typeof s.value === "number" ? s.value : s.value}
          </p>
          {s.sub && (
            <p className={compact ? "mt-0.5 text-[10px] text-slate-500" : "mt-1 text-xs text-slate-500"}>
              {s.sub}
            </p>
          )}
        </div>
      ))}
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
    { label: "Manutenções", value: total, sub: periodoLabel },
    { label: "Valor gasto", value: formatarMoeda(valor), sub: periodoLabel },
    { label: "Preventivas", value: preventivas, sub: "Cadastro frota" },
    { label: "De viagens", value: viagem, sub: `${finalizadas} finalizadas` },
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
    { label: "Abastecimentos", value: total, sub: periodoLabel },
    {
      label: "Valor total (líquido)",
      value: formatarMoeda(valorLiquido),
      sub: valorSub,
    },
    { label: "KM registrados", value: formatKmBr(km), sub: "Soma dos lançamentos" },
    { label: "De viagens", value: viagem, sub: "Acompanhamento" },
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
    },
    {
      label: "Diesel Comum",
      value: formatarMoeda(dieselComum),
      sub: `${periodoLabel} · fora do consumo KM/L`,
    },
    {
      label: "Diesel S500",
      value: formatarMoeda(dieselS500),
      sub: `${periodoLabel} · fora do consumo KM/L`,
    },
  ];
}
