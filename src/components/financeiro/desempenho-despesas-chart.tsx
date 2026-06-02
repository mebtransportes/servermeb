"use client";

import type { DesempenhoMensal } from "@/lib/custos-operacionais";
import { formatarMoeda } from "@/lib/frota-filters";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export function DesempenhoDespesasChart({ dados }: { dados: DesempenhoMensal }) {
  const max = Math.max(dados.mesAtual, dados.mesAnterior, 1);
  const pctAtual = (dados.mesAtual / max) * 100;
  const pctAnterior = (dados.mesAnterior / max) * 100;
  const subiu = (dados.variacaoPct ?? 0) > 0;
  const igual = dados.variacaoPct === 0;

  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-5">
      <h3 className="mb-4 text-sm font-semibold text-slate-300">Desempenho de despesas</h3>
      <p className="mb-4 text-xs text-slate-500">
        Comparação do mês atual com o mês anterior (viagens do motorista selecionado)
      </p>

      <div className="space-y-4">
        <div>
          <div className="mb-1 flex justify-between text-xs">
            <span className="text-slate-400 capitalize">{dados.labelAnterior}</span>
            <span className="font-medium text-slate-300">{formatarMoeda(dados.mesAnterior)}</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-700">
            <div
              className="h-full rounded-full bg-slate-500 transition-all"
              style={{ width: `${pctAnterior}%` }}
            />
          </div>
        </div>
        <div>
          <div className="mb-1 flex justify-between text-xs">
            <span className="text-cyan-400 capitalize">{dados.labelAtual}</span>
            <span className="font-medium text-cyan-300">{formatarMoeda(dados.mesAtual)}</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-700">
            <div
              className="h-full rounded-full bg-cyan-500 transition-all"
              style={{ width: `${pctAtual}%` }}
            />
          </div>
        </div>
      </div>

      <div
        className={cn(
          "mt-4 flex items-center gap-2 rounded-lg px-3 py-2 text-sm",
          igual && "bg-slate-800 text-slate-400",
          subiu && !igual && "bg-amber-950/40 text-amber-300",
          !subiu && !igual && "bg-emerald-950/40 text-emerald-300"
        )}
      >
        {igual ? (
          <Minus className="h-4 w-4" />
        ) : subiu ? (
          <TrendingUp className="h-4 w-4" />
        ) : (
          <TrendingDown className="h-4 w-4" />
        )}
        <span>
          {igual
            ? "Despesas estáveis em relação ao mês anterior."
            : subiu
              ? `Gastou ${Math.abs(dados.variacaoPct ?? 0).toFixed(0)}% a mais que no mês passado.`
              : `Gastou ${Math.abs(dados.variacaoPct ?? 0).toFixed(0)}% a menos que no mês passado.`}
        </span>
      </div>
    </div>
  );
}
