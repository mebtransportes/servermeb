import { Wallet } from "lucide-react";

export default function ControleGastosPage() {
  return (
    <div className="space-y-4">
      <header className="flex items-center gap-3">
        <Wallet className="h-8 w-8 text-amber-400" />
        <div>
          <h1 className="text-2xl font-bold">Controle de Gastos</h1>
          <p className="text-slate-400">Módulo em desenvolvimento.</p>
        </div>
      </header>
    </div>
  );
}
