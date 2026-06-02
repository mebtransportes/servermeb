"use client";

import { useMemo, useState } from "react";
import { PeriodoFilter } from "@/components/frota/periodo-filter";
import { cn } from "@/lib/utils";
import type { PontoGrafico, AgrupamentoGrafico } from "@/lib/dashboard-viagens";
import type { PeriodoFiltroState } from "@/lib/frota-filters";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";

const AGRUPAMENTOS: { value: AgrupamentoGrafico; label: string }[] = [
  { value: "mes", label: "Mensal" },
  { value: "semana", label: "Semanal" },
  { value: "ano", label: "Anual" },
];

const W = 800;
const H = 300;
const PAD = { top: 28, right: 20, bottom: 52, left: 44 };

export function ViagensCrescimentoChart({
  dados,
  periodo,
  onPeriodoChange,
  agrupamento,
  onAgrupamentoChange,
}: {
  dados: PontoGrafico[];
  periodo: PeriodoFiltroState;
  onPeriodoChange: (p: PeriodoFiltroState) => void;
  agrupamento: AgrupamentoGrafico;
  onAgrupamentoChange: (a: AgrupamentoGrafico) => void;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const totalGeral = dados.reduce((s, d) => s + d.total, 0);
  const max = Math.max(...dados.map((d) => d.total), 1);

  const chart = useMemo(() => buildLineChart(dados, max), [dados, max]);
  const active = hovered != null ? dados[hovered] : null;

  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">
            Crescimento de viagens
          </h2>
          <p className="text-sm text-slate-400">
            Quantidade cadastrada por período · {totalGeral} viagem(ns) no filtro
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {AGRUPAMENTOS.map((a) => (
            <button
              key={a.value}
              type="button"
              onClick={() => onAgrupamentoChange(a.value)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition",
                agrupamento === a.value
                  ? "bg-cyan-600 text-white"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700"
              )}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <p className="mb-2 text-xs text-slate-500">Filtrar período dos dados</p>
        <PeriodoFilter value={periodo} onChange={onPeriodoChange} />
      </div>

      {dados.length === 0 ? (
        <p className="py-12 text-center text-slate-500">
          Nenhuma viagem no período selecionado.
        </p>
      ) : (
        <>
          <div className="relative w-full overflow-x-auto">
            <svg
              viewBox={`0 0 ${W} ${H}`}
              className="w-full min-w-[320px] max-h-[320px]"
              preserveAspectRatio="xMidYMid meet"
              role="img"
              aria-label="Gráfico de linha do crescimento de viagens"
            >
              <defs>
                <linearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgb(6, 182, 212)" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="rgb(6, 182, 212)" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="lineStroke" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#0891b2" />
                  <stop offset="100%" stopColor="#22d3ee" />
                </linearGradient>
              </defs>

              {chart.gridY.map((g, i) => (
                <g key={i}>
                  <line
                    x1={PAD.left}
                    y1={g.y}
                    x2={W - PAD.right}
                    y2={g.y}
                    stroke="rgb(51, 65, 85)"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={PAD.left - 8}
                    y={g.y + 4}
                    textAnchor="end"
                    className="fill-slate-500 text-[11px]"
                  >
                    {g.label}
                  </text>
                </g>
              ))}

              {chart.areaPath && (
                <path d={chart.areaPath} fill="url(#lineFill)" />
              )}

              {chart.linePath && (
                <path
                  d={chart.linePath}
                  fill="none"
                  stroke="url(#lineStroke)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {chart.points.map((p, i) => (
                <g
                  key={p.chave}
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                  className="cursor-pointer"
                >
                  {hovered === i && (
                    <line
                      x1={p.x}
                      y1={PAD.top}
                      x2={p.x}
                      y2={H - PAD.bottom}
                      stroke="rgb(34, 211, 238)"
                      strokeWidth="1"
                      strokeOpacity="0.4"
                    />
                  )}
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={hovered === i ? 7 : 5}
                    fill={hovered === i ? "#22d3ee" : "#0e7490"}
                    stroke="#fff"
                    strokeWidth="2"
                  />
                </g>
              ))}

              {chart.points.map((p) => (
                <text
                  key={`lbl-${p.chave}`}
                  x={p.x}
                  y={H - 16}
                  textAnchor="middle"
                  className="fill-slate-400 text-[10px]"
                >
                  {p.label}
                </text>
              ))}
            </svg>

            {active && chart.points[hovered!] && (
              <div
                className="pointer-events-none absolute top-4 rounded-lg border border-cyan-700/50 bg-slate-900/95 px-3 py-2 shadow-lg"
                style={{
                  left: `${(chart.points[hovered!].x / W) * 100}%`,
                  transform: "translateX(-50%)",
                }}
              >
                <p className="text-xs text-slate-400">{active.label}</p>
                <p className="text-lg font-bold text-cyan-400">{active.total} viagens</p>
                {active.crescimentoPct != null && (
                  <div className="mt-0.5">
                    <CrescimentoBadge pct={active.crescimentoPct} />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-3 border-t border-slate-700/50 pt-4">
            {dados.map((p, i) => (
              <button
                key={p.chave}
                type="button"
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-left text-xs transition",
                  hovered === i
                    ? "border-cyan-500/60 bg-cyan-950/40"
                    : "border-slate-700/50 bg-slate-900/40 hover:border-slate-600"
                )}
              >
                <span className="text-slate-400">{p.label}</span>
                <div className="mt-0.5 flex items-center gap-2">
                  <span className="font-bold text-white">{p.total}</span>
                  {p.crescimentoPct != null && (
                    <CrescimentoBadge pct={p.crescimentoPct} />
                  )}
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function buildLineChart(dados: PontoGrafico[], max: number) {
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;
  const baseY = PAD.top + chartH;

  const ticks = 4;
  const gridY = Array.from({ length: ticks + 1 }, (_, i) => {
    const v = Math.round((max * (ticks - i)) / ticks);
    const y = PAD.top + (i / ticks) * chartH;
    return { y, label: String(v) };
  });

  const points = dados.map((p, i) => {
    const x =
      dados.length <= 1
        ? PAD.left + chartW / 2
        : PAD.left + (i / (dados.length - 1)) * chartW;
    const y = PAD.top + chartH - (p.total / max) * chartH;
    return { x, y, ...p };
  });

  const linePath =
    points.length > 0
      ? smoothLinePath(points)
      : "";

  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x} ${baseY} L ${points[0].x} ${baseY} Z`
      : "";

  return { points, linePath, areaPath, gridY };
}

/** Curva suave entre os pontos (Bézier) */
function smoothLinePath(points: { x: number; y: number }[]) {
  if (points.length === 1) {
    return `M ${points[0].x} ${points[0].y}`;
  }
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const cx = (p0.x + p1.x) / 2;
    d += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
  }
  return d;
}

function CrescimentoBadge({ pct }: { pct: number }) {
  const arred = Math.round(pct);
  if (arred === 0) {
    return (
      <span className="flex items-center gap-0.5 text-xs text-slate-500">
        <Minus className="h-3 w-3" />
        0%
      </span>
    );
  }
  const positivo = arred > 0;
  return (
    <span
      className={cn(
        "flex items-center gap-0.5 text-xs font-medium",
        positivo ? "text-emerald-400" : "text-red-400"
      )}
    >
      {positivo ? (
        <TrendingUp className="h-3 w-3" />
      ) : (
        <TrendingDown className="h-3 w-3" />
      )}
      {positivo ? "+" : ""}
      {arred}%
    </span>
  );
}
