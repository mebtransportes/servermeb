"use client";

import { useState } from "react";
import { AnexoArquivoRow } from "@/components/shared/anexo-arquivo-row";
import { formatarMoeda } from "@/lib/frota-filters";
import {
  atualizarOutroDespesaDescontaMotorista,
  type FechamentoOutroDespesa,
} from "@/lib/fechamento-outros-despesas";
import { cn } from "@/lib/utils";
import { mebAlert } from "@/lib/meb-dialog";

export function FechamentoOutrosDespesasBlock({
  despesas,
  className,
  compact,
  editavel = false,
  onAlterado,
}: {
  despesas: FechamentoOutroDespesa[];
  className?: string;
  compact?: boolean;
  editavel?: boolean;
  onAlterado?: () => void | Promise<void>;
}) {
  const [salvandoId, setSalvandoId] = useState<string | null>(null);

  if (!despesas.length) return null;

  async function toggleDesconto(d: FechamentoOutroDespesa, checked: boolean) {
    setSalvandoId(d.id);
    const err = await atualizarOutroDespesaDescontaMotorista(
      d.id,
      d.viagem_id,
      checked
    );
    setSalvandoId(null);
    if (err) {
      await mebAlert(err);
      return;
    }
    await onAlterado?.();
  }

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
          {editavel && (
            <label className="mt-2 flex cursor-pointer items-start gap-2">
              <input
                type="checkbox"
                checked={d.desconta_motorista}
                disabled={salvandoId === d.id}
                onChange={(e) => toggleDesconto(d, e.target.checked)}
                className="mt-0.5 rounded border-slate-300"
              />
              <span className={cn("text-slate-700", compact ? "text-[10px]" : "text-xs")}>
                Descontar do motorista na comissão
              </span>
            </label>
          )}
          {!editavel && d.desconta_motorista && (
            <p className={cn("mt-1 text-amber-700", compact ? "text-[10px]" : "text-xs")}>
              Desconta da comissão do motorista
            </p>
          )}
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
