"use client";

import { cn } from "@/lib/utils";

export function FechamentoSecao({
  titulo,
  children,
  className,
}: {
  titulo: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("mt-4", className)}>
      <h4 className="mb-2 border-b border-slate-200 pb-1 text-xs font-bold uppercase tracking-wide text-slate-600">
        {titulo}
      </h4>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

export function FechamentoLinhaCampos({
  campos,
  cols = 3,
}: {
  campos: { rotulo: string; valor: string }[];
  cols?: 1 | 2 | 3 | 4;
}) {
  return (
    <div
      className={cn(
        "grid gap-3 rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2.5",
        cols === 1 && "grid-cols-1",
        cols === 2 && "grid-cols-1 sm:grid-cols-2",
        cols === 3 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
        cols === 4 && "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
      )}
    >
      {campos.map((c) => (
        <div key={c.rotulo} className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            {c.rotulo}
          </p>
          <p className="mt-0.5 text-sm font-medium text-slate-900 break-words">{c.valor}</p>
        </div>
      ))}
    </div>
  );
}

export function FechamentoDestaque({
  rotulo,
  valor,
  subtitulo,
  tema = "emerald",
}: {
  rotulo: string;
  valor: string;
  subtitulo?: string;
  tema?: "emerald" | "orange" | "cyan";
}) {
  const cores = {
    emerald: "border-emerald-200 bg-emerald-50/80 text-emerald-800",
    orange: "border-orange-200 bg-orange-50/80 text-orange-800",
    cyan: "border-cyan-200 bg-cyan-50/80 text-cyan-800",
  };
  return (
    <div className={cn("mt-3 rounded-lg border px-4 py-3 text-center", cores[tema])}>
      <p className="text-xs text-slate-600">{rotulo}</p>
      {subtitulo && <p className="text-[10px] text-slate-500">{subtitulo}</p>}
      <p className="mt-1 text-xl font-bold">{valor}</p>
    </div>
  );
}

export function FechamentoListaItens({
  titulo,
  itens,
}: {
  titulo: string;
  itens: { nome: string; valor: string }[];
}) {
  if (!itens.length) return null;
  return (
    <div className="mt-2 space-y-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{titulo}</p>
      {itens.map((item, i) => (
        <div
          key={`${item.nome}-${i}`}
          className="flex items-center justify-between gap-2 rounded border border-slate-200 bg-white px-2.5 py-1.5 text-sm"
        >
          <span className="text-slate-700">{item.nome}</span>
          <span className="shrink-0 font-semibold text-slate-900">{item.valor}</span>
        </div>
      ))}
    </div>
  );
}
