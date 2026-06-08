import { formatarMoeda } from "@/lib/frota-filters";

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
          className={
            compact
              ? "rounded-lg border border-slate-700/50 bg-slate-800/40 p-2.5"
              : "rounded-xl border border-slate-700/50 bg-slate-800/40 p-4"
          }
        >
          <p className={compact ? "text-[10px] text-slate-400" : "text-sm text-slate-400"}>
            {s.label}
          </p>
          <p className={compact ? "mt-0.5 text-lg font-bold text-cyan-400" : "mt-1 text-2xl font-bold text-cyan-400"}>
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
  items: { valor: number; source: string; km?: number | null }[],
  periodoLabel: string
) {
  const total = items.length;
  const valor = items.reduce((s, i) => s + i.valor, 0);
  const km = items.reduce((s, i) => s + (i.km ?? 0), 0);
  const viagem = items.filter((i) => i.source === "viagem").length;

  return [
    { label: "Abastecimentos", value: total, sub: periodoLabel },
    { label: "Valor total", value: formatarMoeda(valor), sub: periodoLabel },
    { label: "KM registrados", value: km.toLocaleString("pt-BR"), sub: "Soma dos lançamentos" },
    { label: "De viagens", value: viagem, sub: "Acompanhamento" },
  ];
}
