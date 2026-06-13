"use client";

import { formatarMoeda } from "@/lib/frota-filters";
import type { FechamentoAdiantamento } from "@/lib/fechamento-adiantamentos";
import { cn } from "@/lib/utils";

export function FechamentoAdiantamentosBlock({
  adiantamentos,
  className,
  compact,
}: {
  adiantamentos: FechamentoAdiantamento[];
  className?: string;
  compact?: boolean;
}) {
  if (!adiantamentos.length) return null;

  return (
    <div className={cn("space-y-2", className)}>
      <p
        className={cn(
          "font-semibold uppercase tracking-wide text-orange-700",
          compact ? "text-[10px]" : "text-xs"
        )}
      >
        Detalhamento — adiantamentos
      </p>
      {adiantamentos.map((a) => (
        <div
          key={a.id}
          className={cn(
            "rounded-lg border border-orange-200 bg-orange-50/60",
            compact ? "px-2.5 py-2" : "px-3 py-2.5"
          )}
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <span className={cn("font-medium text-slate-800", compact ? "text-xs" : "text-sm")}>
              {a.descricao?.trim() || "Adiantamento"}
            </span>
            <span className={cn("font-semibold text-orange-800", compact ? "text-xs" : "text-sm")}>
              {formatarMoeda(a.valor)}
            </span>
          </div>
          <p className={cn("text-slate-500", compact ? "text-[10px]" : "text-xs")}>
            {new Date(a.realizado_em).toLocaleString("pt-BR")}
          </p>
        </div>
      ))}
    </div>
  );
}
