import { LayoutDashboard } from "lucide-react";

export default function DashboardPage() {
  return (
    <div>
      <header className="mb-8 flex items-center gap-3">
        <LayoutDashboard className="h-8 w-8 text-cyan-400" />
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400">Visão geral do sistema</p>
        </div>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          "Veículos cadastrados",
          "Motoristas ativos",
          "Alertas de vencimento",
        ].map((title) => (
          <div
            key={title}
            className="rounded-xl border border-slate-700/50 bg-slate-800/40 p-6"
          >
            <p className="text-sm text-slate-400">{title}</p>
            <p className="mt-2 text-3xl font-bold text-cyan-400">—</p>
            <p className="mt-1 text-xs text-slate-500">Em breve</p>
          </div>
        ))}
      </div>
    </div>
  );
}
