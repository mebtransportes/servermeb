import { PERIODOS, type PeriodoFiltro } from "@/lib/frota-filters";
import { cn } from "@/lib/utils";

export function PeriodoFilter({
  value,
  onChange,
}: {
  value: PeriodoFiltro;
  onChange: (p: PeriodoFiltro) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {PERIODOS.map((p) => (
        <button
          key={p.value}
          type="button"
          onClick={() => onChange(p.value)}
          className={cn(
            "rounded-lg px-3 py-1.5 text-xs font-medium transition",
            value === p.value
              ? "bg-cyan-600 text-white"
              : "bg-slate-800 text-slate-400 hover:bg-slate-700"
          )}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
