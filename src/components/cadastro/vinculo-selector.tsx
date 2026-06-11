"use client";

import type { RecursoVinculo } from "@/types";
import { VINCULO_OPCOES } from "@/lib/viagem-validation";
import { cn, mebFormSubsection } from "@/lib/utils";

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
    <div className={mebFormSubsection}>
      <p className="mb-3 text-sm font-semibold text-slate-700">{label}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {VINCULO_OPCOES.map((opcao) => {
          const ativo = value === opcao.value;
          return (
            <label
              key={opcao.value}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition",
                ativo
                  ? "border-emerald-300 bg-emerald-50 ring-1 ring-emerald-200"
                  : "border-slate-200 bg-white hover:border-slate-300"
              )}
            >
              <input
                type="radio"
                name="vinculo"
                value={opcao.value}
                checked={ativo}
                onChange={() => onChange(opcao.value)}
                className="h-4 w-4 border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-sm font-medium text-slate-800">{opcao.label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
