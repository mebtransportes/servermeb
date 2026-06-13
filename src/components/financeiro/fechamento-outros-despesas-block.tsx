"use client";

import { AnexoArquivoRow } from "@/components/shared/anexo-arquivo-row";
import { formatarMoeda } from "@/lib/frota-filters";
import type { FechamentoOutroDespesa } from "@/lib/fechamento-outros-despesas";
import { cn } from "@/lib/utils";

export function FechamentoOutrosDespesasBlock({
  despesas,
  className,
  compact,
}: {
  despesas: FechamentoOutroDespesa[];
  className?: string;
  compact?: boolean;
}) {
  if (!despesas.length) return null;

  return (
    <div className={cn("space-y-2", className)}>
      <p
        className={cn(
          "font-semibold uppercase tracking-wide text-slate-600",
          compact ? "text-[10px]" : "text-xs"
        )}
      >
        Detalhamento — outras despesas
      </p>
      {despesas.map((d) => (
        <div
          key={d.id}
          className={cn(
            "rounded-lg border border-slate-200 bg-slate-50/80",
            compact ? "px-2.5 py-2" : "px-3 py-2.5"
          )}
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <span className={cn("font-medium text-slate-800", compact ? "text-xs" : "text-sm")}>
              {d.nome}
            </span>
            <span className={cn("font-semibold text-slate-900", compact ? "text-xs" : "text-sm")}>
              {formatarMoeda(d.valor)}
            </span>
          </div>
          <p className={cn("text-slate-500", compact ? "text-[10px]" : "text-xs")}>
            {new Date(d.realizado_em).toLocaleString("pt-BR")}
          </p>
          {d.anexos.length > 0 ? (
            <ul className="mt-2 space-y-1">
              {d.anexos.map((a, i) => (
                <li key={a.id ?? `${d.id}-anexo-${i}`}>
                  <AnexoArquivoRow label={a.label} storagePath={a.storage_path} />
                </li>
              ))}
            </ul>
          ) : (
            <p className={cn("mt-1 text-slate-400", compact ? "text-[10px]" : "text-xs")}>
              Sem anexos
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
