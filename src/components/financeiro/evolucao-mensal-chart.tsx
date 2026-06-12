"use client";

import { useMemo, useState } from "react";
import type { PontoGraficoMensal } from "@/lib/grafico-mensal";
import { formatarMoeda } from "@/lib/frota-filters";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { cn, mebCard } from "@/lib/utils";

const W = 800;
const H = 280;
const PAD = { top: 28, right: 20, bottom: 52, left: 56 };

const THEMES = {
  purple: {
    border: "border-purple-200/80",
    line: "#9333ea",
    fillStart: "rgb(147, 51, 234)",
    dot: "#7c3aed",
    dotHover: "#a855f7",
    tooltipBorder: "border-purple-200",
    value: "text-purple-700",
    gradientId: "lineFillPurple",
  },
  amber: {
    border: "border-amber-200/80",
    line: "#d97706",
    fillStart: "rgb(245, 158, 11)",
    dot: "#b45309",
    dotHover: "#f59e0b",
    tooltipBorder: "border-amber-200",
    value: "text-amber-700",
    gradientId: "lineFillAmber",
  },
  cyan: {
    border: "border-cyan-200/80",
    line: "#0891b2",
    fillStart: "rgb(6, 182, 212)",
    dot: "#0e7490",
    dotHover: "#06b6d4",
    tooltipBorder: "border-cyan-200",
    value: "text-cyan-700",
    gradientId: "lineFillCyan",
  },
} as const;

export function EvolucaoMensalChart({
  dados,
  titulo,
  subtitulo,
  tema = "purple",
}: {
  dados: PontoGraficoMensal[];
  titulo: string;
  subtitulo: string;
  tema?: keyof typeof THEMES;
}) {
  const t = THEMES[tema];
  const [hovered, setHovered] = useState<number | null>(null);
  const max = Math.max(...dados.map((d) => d.total), 1);
  const chart = useMemo(() => buildLineChart(dados, max), [dados, max]);
  const active = hovered != null ? dados[hovered] : null;
  const ultimo = dados[dados.length - 1];
  const penultimo = dados.length > 1 ? dados[dados.length - 2] : null;
  const variacaoUltimo =
    ultimo && penultimo
      ? penultimo.total === 0
        ? ultimo.total > 0
          ? 100
          : 0
        : ((ultimo.total - penultimo.total) / penultimo.total) * 100
      : null;

  return (
    <div className={cn(mebCard, "p-5", t.border)}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">{titulo}</h2>
          <p className="text-base text-slate-500">{subtitulo}</p>
        </div>
        {ultimo && variacaoUltimo != null && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
            <span className="text-slate-500">vs. mês anterior: </span>
            <VariacaoBadge pct={variacaoUltimo} />
          </div>
        )}
      </div>

      {dados.length === 0 ? (
        <p className="py-10 text-center text-base text-slate-400">Sem dados para o gráfico.</p>
      ) : (
        <div className="relative w-full overflow-x-auto">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full min-w-[320px] max-h-[300px]"
            preserveAspectRatio="xMidYMid meet"
          >
            <defs>
              <linearGradient id={t.gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={t.fillStart} stopOpacity="0.35" />
                <stop offset="100%" stopColor={t.fillStart} stopOpacity="0" />
              </linearGradient>
            </defs>
            {chart.gridY.map((g, i) => (
              <g key={i}>
                <line
                  x1={PAD.left}
                  y1={g.y}
                  x2={W - PAD.right}
                  y2={g.y}
                  stroke="#e2e8f0"
                  strokeDasharray="4 4"
                />
                <text x={PAD.left - 6} y={g.y + 4} textAnchor="end" className="fill-slate-500 text-xs">
                  {g.label}
                </text>
              </g>
            ))}
            {chart.areaPath && <path d={chart.areaPath} fill={`url(#${t.gradientId})`} />}
            {chart.linePath && (
              <path
                d={chart.linePath}
                fill="none"
                stroke={t.line}
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            )}
            {chart.points.map((p, i) => (
              <g
                key={p.chave}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                className="cursor-pointer"
              >
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={hovered === i ? 7 : 5}
                  fill={hovered === i ? t.dotHover : t.dot}
                  stroke="#fff"
                  strokeWidth="2"
                />
              </g>
            ))}
            {chart.points.map((p) => (
              <text
                key={`l-${p.chave}`}
                x={p.x}
                y={H - 14}
                textAnchor="middle"
                className="fill-slate-500 text-xs"
              >
                {p.label}
              </text>
            ))}
          </svg>
          {active && hovered != null && chart.points[hovered] && (
            <div
              className={cn(
                "pointer-events-none absolute top-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-md",
                t.tooltipBorder
              )}
              style={{
                left: `${(chart.points[hovered].x / W) * 100}%`,
                transform: "translateX(-50%)",
              }}
            >
              <p className="text-xs text-slate-400">{active.label}</p>
              <p className={cn("text-lg font-bold", t.value)}>{formatarMoeda(active.total)}</p>
              {active.variacaoPct != null && <VariacaoBadge pct={active.variacaoPct} />}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function buildLineChart(dados: PontoGraficoMensal[], max: number) {
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;
  const baseY = PAD.top + chartH;
  const ticks = 4;
  const gridY = Array.from({ length: ticks + 1 }, (_, i) => {
    const v = (max * (ticks - i)) / ticks;
    const y = PAD.top + (i / ticks) * chartH;
    const label =
      v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : String(Math.round(v));
    return { y, label };
  });
  const points = dados.map((p, i) => {
    const x =
      dados.length <= 1 ? PAD.left + chartW / 2 : PAD.left + (i / (dados.length - 1)) * chartW;
    const y = PAD.top + chartH - (p.total / max) * chartH;
    return { x, y, ...p };
  });
  const linePath = points.length > 0 ? smoothLinePath(points) : "";
  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x} ${baseY} L ${points[0].x} ${baseY} Z`
      : "";
  return { points, linePath, areaPath, gridY };
}

function smoothLinePath(points: { x: number; y: number }[]) {
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const cx = (p0.x + p1.x) / 2;
    d += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
  }
  return d;
}

function VariacaoBadge({ pct }: { pct: number }) {
  const arred = Math.round(pct);
  if (arred === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-slate-500">
        <Minus className="h-3 w-3" /> estável
      </span>
    );
  }
  const gastouMais = arred > 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium",
        gastouMais ? "text-amber-600" : "text-emerald-600"
      )}
    >
      {gastouMais ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {gastouMais ? `+${arred}% gasto` : `${Math.abs(arred)}% economia`}
    </span>
  );
}
