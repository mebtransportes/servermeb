"use client";

import {
  PERIODOS,
  type PeriodoFiltroState,
  type PeriodoPreset,
} from "@/lib/frota-filters";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function PeriodoFilter({
  value,
  onChange,
}: {
  value: PeriodoFiltroState;
  onChange: (v: PeriodoFiltroState) => void;
}) {
  const isCustom = value.preset === "custom";

  function setPreset(preset: PeriodoPreset) {
    onChange({
      ...value,
      preset,
      ...(preset !== "custom" ? { dataDe: "", dataAte: "" } : {}),
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {PERIODOS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => setPreset(p.value)}
            className={cn(
              "rounded-lg px-3.5 py-2 text-sm font-medium transition",
              value.preset === p.value
                ? "bg-[#33388d] text-white shadow-sm"
                : "border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50"
            )}
          >
            {p.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setPreset("custom")}
          className={cn(
            "rounded-lg px-3.5 py-2 text-sm font-medium transition",
            isCustom
              ? "bg-[#33388d] text-white shadow-sm"
              : "border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50"
          )}
        >
          Datas específicas
        </button>
      </div>

      {isCustom && (
        <div className="grid max-w-md gap-3 sm:grid-cols-2">
          <Input
            label="De"
            type="date"
            value={value.dataDe}
            onChange={(e) => onChange({ ...value, dataDe: e.target.value })}
          />
          <Input
            label="Até"
            type="date"
            value={value.dataAte}
            onChange={(e) => onChange({ ...value, dataAte: e.target.value })}
          />
        </div>
      )}
    </div>
  );
}
