"use client";

import {
  PERIODOS,
  type PeriodoFiltroState,
  type PeriodoPreset,
} from "@/lib/frota-filters";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

const PERIODO_OPCOES: { value: PeriodoPreset; label: string }[] = [
  ...PERIODOS,
  { value: "custom", label: "Datas específicas" },
];

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
    <div className="flex flex-wrap items-end gap-3">
      <Select
        label="Período"
        tone="light"
        value={value.preset}
        onChange={(e) => setPreset(e.target.value as PeriodoPreset)}
        options={PERIODO_OPCOES.map((p) => ({ value: p.value, label: p.label }))}
        className="min-w-[11rem] h-10"
      />

      {isCustom && (
        <>
          <Input
            label="De"
            type="date"
            tone="light"
            value={value.dataDe}
            onChange={(e) => onChange({ ...value, dataDe: e.target.value })}
          />
          <Input
            label="Até"
            type="date"
            tone="light"
            value={value.dataAte}
            onChange={(e) => onChange({ ...value, dataAte: e.target.value })}
          />
        </>
      )}
    </div>
  );
}
