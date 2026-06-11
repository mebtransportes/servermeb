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
import { cn, mebCardSm } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

const CARD_ICONS: Record<string, LucideIcon> = {
  "EM CARREGAMENTO": Package,
  "EM ROTA": Route,
  "EM MANUTENÇÃO": Wrench,
  "AGUARDANDO DESCARGA": Clock,
  "DESCARGA EM ANDAMENTO": Truck,
  FINALIZADO: CheckCircle,
  "PAGAMENTO PENDENTE": Wallet,
  ARQUIVADO: Archive,
};

export function ViagemStatusCards({
  counts,
}: {
  counts: Record<string, number>;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-4">
      {STATUS_CARDS.map((status) => {
        const total = counts[status] ?? 0;
        const href = `/operacional/acompanhamento?status=${encodeURIComponent(status)}`;
        const Icon = CARD_ICONS[status] ?? Truck;
        const label = VIAGEM_STATUS_LABEL[status] ?? status;

        return (
          <Link
            key={status}
            href={href}
            className={cn(
              mebCardSm,
              "flex items-center gap-3 p-3 transition hover:bg-white/80"
            )}
          >
            <Icon className="h-5 w-5 shrink-0 text-slate-400" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs text-slate-500">{label}</p>
              <p className="text-xl font-bold text-slate-900">{total}</p>
            </div>
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-300" />
          </Link>
        );
      })}
    </div>
  );
}
