"use client";

import Link from "next/link";
import {
  Package,
  Route,
  Wrench,
  Clock,
  Truck,
  CheckCircle,
  Wallet,
  Archive,
  ArrowRight,
} from "lucide-react";
import { VIAGEM_STATUS_LABEL } from "@/lib/viagem-status";
import { STATUS_CARDS } from "@/lib/dashboard-viagens";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

const CARD_META: Record<
  string,
  { icon: LucideIcon; accent: string; iconClass: string }
> = {
  "EM CARREGAMENTO": {
    icon: Package,
    accent: "border-amber-500/40",
    iconClass: "text-amber-400",
  },
  "EM ROTA": {
    icon: Route,
    accent: "border-cyan-500/40",
    iconClass: "text-cyan-400",
  },
  "EM MANUTENÇÃO": {
    icon: Wrench,
    accent: "border-rose-500/40",
    iconClass: "text-rose-400",
  },
  "AGUARDANDO DESCARGA": {
    icon: Clock,
    accent: "border-violet-500/40",
    iconClass: "text-violet-400",
  },
  "DESCARGA EM ANDAMENTO": {
    icon: Truck,
    accent: "border-orange-500/40",
    iconClass: "text-orange-400",
  },
  FINALIZADO: {
    icon: CheckCircle,
    accent: "border-emerald-500/40",
    iconClass: "text-emerald-400",
  },
  "PAGAMENTO PENDENTE": {
    icon: Wallet,
    accent: "border-amber-500/40",
    iconClass: "text-amber-300",
  },
  ARQUIVADO: {
    icon: Archive,
    accent: "border-slate-500/40",
    iconClass: "text-slate-400",
  },
};

export function ViagemStatusCards({
  counts,
}: {
  counts: Record<string, number>;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-4">
      {STATUS_CARDS.map((status) => {
        const meta = CARD_META[status] ?? {
          icon: Truck,
          accent: "border-slate-600/40",
          iconClass: "text-slate-400",
        };
        const total = counts[status] ?? 0;
        const href = `/operacional/acompanhamento?status=${encodeURIComponent(status)}`;
        const Icon = meta.icon;
        const label = VIAGEM_STATUS_LABEL[status] ?? status;

        return (
          <Link
            key={status}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-lg border bg-[#1a1a1a] p-3 transition hover:bg-slate-800/80",
              meta.accent
            )}
          >
            <Icon className={cn("h-5 w-5 shrink-0", meta.iconClass)} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-slate-400">{label}</p>
              <p className="text-xl font-bold text-white">{total}</p>
            </div>
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-600" />
          </Link>
        );
      })}
    </div>
  );
}
