"use client";

import Link from "next/link";
import { Truck, Package, Route, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const CARDS = [
  {
    status: "EM ANDAMENTO",
    title: "Viagens em andamento",
    icon: Truck,
    accent: "border-cyan-600/40 bg-cyan-950/25",
    iconClass: "text-cyan-400",
  },
  {
    status: "EM CARREGAMENTO",
    title: "Viagens em carregamento",
    icon: Package,
    accent: "border-amber-600/40 bg-amber-950/20",
    iconClass: "text-amber-400",
  },
  {
    status: "EM ROTA",
    title: "Viagens em rota",
    icon: Route,
    accent: "border-violet-600/40 bg-violet-950/20",
    iconClass: "text-violet-400",
  },
] as const;

export function ViagemStatusCards({
  counts,
}: {
  counts: Record<string, number>;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {CARDS.map((card) => {
        const total = counts[card.status] ?? 0;
        const href = `/operacional/acompanhamento?status=${encodeURIComponent(card.status)}`;
        return (
          <div
            key={card.status}
            className={cn(
              "flex flex-col rounded-xl border p-5 transition",
              card.accent
            )}
          >
            <div className="mb-3 flex items-start justify-between gap-2">
              <div>
                <p className="text-sm text-slate-400">{card.title}</p>
                <p className="mt-1 text-4xl font-bold text-white">{total}</p>
              </div>
              <card.icon className={cn("h-8 w-8 shrink-0", card.iconClass)} />
            </div>
            <Link
              href={href}
              className="mt-auto inline-flex items-center gap-1 text-sm text-cyan-400 hover:underline"
            >
              Ver no acompanhamento
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        );
      })}
    </div>
  );
}
