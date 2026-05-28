import { DollarSign } from "lucide-react";

export default function FinanceiroPage() {
  return (
    <div>
      <header className="mb-6 flex items-center gap-3">
        <DollarSign className="h-8 w-8 text-cyan-400" />
        <div>
          <h1 className="text-2xl font-bold">Financeiro</h1>
          <p className="text-slate-400">Módulo financeiro em desenvolvimento.</p>
        </div>
      </header>
      <div className="rounded-xl border border-dashed border-slate-600 bg-slate-800/30 p-12 text-center text-slate-500">
        Conteúdo disponível em breve.
      </div>
    </div>
  );
}
