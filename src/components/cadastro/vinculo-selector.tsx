"use client";

import type { RecursoVinculo } from "@/types";
import { VINCULO_OPCOES } from "@/lib/viagem-validation";
import { cn } from "@/lib/utils";

export function VinculoSelector({
  label,
  value,
  onChange,
}: {
  label: string;
  value: RecursoVinculo;
  onChange: (value: RecursoVinculo) => void;
}) {
  return (
    <div className="rounded-xl border border-cyan-700/40 bg-cyan-950/20 p-4">
      <p className="mb-3 text-sm font-semibold text-cyan-300">{label}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {VINCULO_OPCOES.map((opcao) => {
          const ativo = value === opcao.value;
          return (
            <label
              key={opcao.value}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition",
                ativo
                  ? "border-cyan-500 bg-cyan-900/40 ring-1 ring-cyan-500/50"
                  : "border-slate-600 bg-slate-800/50 hover:border-slate-500"
              )}
            >
              <input
                type="radio"
                name="vinculo"
                value={opcao.value}
                checked={ativo}
                onChange={() => onChange(opcao.value)}
                className="h-4 w-4 border-slate-500 text-cyan-500 focus:ring-cyan-500"
              />
              <span className="text-sm font-medium text-slate-100">{opcao.label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
