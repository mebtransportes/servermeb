import { BarChart3 } from "lucide-react";

export default function FrotaRelatoriosPage() {
  return (
    <div>
      <header className="mb-6 flex items-center gap-3">
        <BarChart3 className="h-8 w-8 text-cyan-400" />
        <div>
          <h1 className="text-2xl font-bold">Relatórios</h1>
          <p className="text-slate-400">Relatórios consolidados da frota</p>
        </div>
      </header>
      <div className="rounded-xl border border-dashed border-slate-600 bg-slate-800/30 p-12 text-center text-slate-500">
        Módulo em desenvolvimento — exportação e gráficos de manutenção e abastecimento.
      </div>
    </div>
  );
}
