"use client";

import Link from "next/link";
import {
  Archive,
  ArrowRight,
  CalendarClock,
  CheckCircle,
  Clock,
  Package,
  Route,
  Truck,
  Wallet,
  Wrench,
} from "lucide-react";
import { VIAGEM_STATUS_LABEL } from "@/lib/viagem-status";
import { STATUS_CARDS } from "@/lib/dashboard-viagens";
import { cn, mebCard } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

const CARD_ICONS: Record<string, LucideIcon> = {
  AGENDADA: CalendarClock,
  "EM CARREGAMENTO": Package,
  "EM ROTA": Route,
  "EM MANUTENÇÃO": Wrench,
  "AGUARDANDO DESCARGA": Clock,
  "DESCARGA EM ANDAMENTO": Truck,
  FINALIZADO: CheckCircle,
  "PAGAMENTO PENDENTE": Wallet,
  ARQUIVADO: Archive,
};

const CARD_STYLES: Record<
  string,
  { accent: string; iconWrap: string; icon: string; hover: string }
> = {
  AGENDADA: {
    accent: "border-l-indigo-500",
    iconWrap: "bg-indigo-100",
    icon: "text-indigo-600",
    hover: "hover:border-indigo-200 hover:shadow-indigo-100/60",
  },
  "EM CARREGAMENTO": {
    accent: "border-l-amber-500",
    iconWrap: "bg-amber-100",
    icon: "text-amber-600",
    hover: "hover:border-amber-200 hover:shadow-amber-100/60",
  },
  "EM ROTA": {
    accent: "border-l-sky-500",
    iconWrap: "bg-sky-100",
    icon: "text-sky-600",
    hover: "hover:border-sky-200 hover:shadow-sky-100/60",
  },
  "EM MANUTENÇÃO": {
    accent: "border-l-rose-500",
    iconWrap: "bg-rose-100",
    icon: "text-rose-600",
    hover: "hover:border-rose-200 hover:shadow-rose-100/60",
  },
  "AGUARDANDO DESCARGA": {
    accent: "border-l-violet-500",
    iconWrap: "bg-violet-100",
    icon: "text-violet-600",
    hover: "hover:border-violet-200 hover:shadow-violet-100/60",
  },
  "DESCARGA EM ANDAMENTO": {
    accent: "border-l-orange-500",
    iconWrap: "bg-orange-100",
    icon: "text-orange-600",
    hover: "hover:border-orange-200 hover:shadow-orange-100/60",
  },
  FINALIZADO: {
    accent: "border-l-emerald-500",
    iconWrap: "bg-emerald-100",
    icon: "text-emerald-600",
    hover: "hover:border-emerald-200 hover:shadow-emerald-100/60",
  },
  "PAGAMENTO PENDENTE": {
    accent: "border-l-yellow-500",
    iconWrap: "bg-yellow-100",
    icon: "text-yellow-700",
    hover: "hover:border-yellow-200 hover:shadow-yellow-100/60",
  },
  ARQUIVADO: {
    accent: "border-l-slate-400",
    iconWrap: "bg-slate-100",
    icon: "text-slate-600",
    hover: "hover:border-slate-300 hover:shadow-slate-100/60",
  },
};

const BAR_COLORS: Record<string, string> = {
  AGENDADA: "bg-indigo-500",
  "EM CARREGAMENTO": "bg-amber-500",
  "EM ROTA": "bg-sky-500",
  "EM MANUTENÇÃO": "bg-rose-500",
  "AGUARDANDO DESCARGA": "bg-violet-500",
  "DESCARGA EM ANDAMENTO": "bg-orange-500",
  FINALIZADO: "bg-emerald-500",
  "PAGAMENTO PENDENTE": "bg-yellow-500",
  ARQUIVADO: "bg-slate-400",
};

export function ViagemStatusCards({ counts }: { counts: Record<string, number> }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {STATUS_CARDS.map((status) => {
        const total = counts[status] ?? 0;
        const href = `/operacional/acompanhamento?status=${encodeURIComponent(status)}`;
        const Icon = CARD_ICONS[status] ?? Truck;
        const label = VIAGEM_STATUS_LABEL[status] ?? status;
        const style = CARD_STYLES[status] ?? CARD_STYLES.ARQUIVADO;

        return (
          <Link
            key={status}
            href={href}
            className={cn(
              mebCard,
              "group flex items-center gap-4 border-l-4 bg-white/80 p-4 shadow-sm transition",
              "hover:-translate-y-0.5 hover:bg-white hover:shadow-md",
              style.accent,
              style.hover
            )}
          >
            <div
              className={cn(
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                style.iconWrap
              )}
            >
              <Icon className={cn("h-5 w-5", style.icon)} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-600">{label}</p>
              <p className="text-2xl font-bold tracking-tight text-slate-900">{total}</p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" />
          </Link>
        );
      })}
    </div>
  );
}

export function ViagemStatusDistribuicao({ counts }: { counts: Record<string, number> }) {
  const itens = STATUS_CARDS.map((status) => ({
    status,
    total: counts[status] ?? 0,
    label: VIAGEM_STATUS_LABEL[status] ?? status,
  }))
    .filter((item) => item.total > 0)
    .sort((a, b) => b.total - a.total);

  const max = Math.max(...itens.map((i) => i.total), 1);
  const total = itens.reduce((s, i) => s + i.total, 0);

  if (!itens.length) {
    return <p className="text-sm text-slate-500">Nenhuma viagem cadastrada.</p>;
  }

  return (
    <div className="space-y-3">
      {itens.map((item) => {
        const pct = Math.round((item.total / total) * 100);
        const width = Math.max(4, Math.round((item.total / max) * 100));
        const barColor = BAR_COLORS[item.status] ?? "bg-slate-400";
        const href = `/operacional/acompanhamento?status=${encodeURIComponent(item.status)}`;

        return (
          <Link
            key={item.status}
            href={href}
            className="group block rounded-lg p-1.5 transition hover:bg-slate-50"
          >
            <div className="mb-1 flex items-center justify-between gap-2 text-xs">
              <span className="truncate font-medium text-slate-700 group-hover:text-slate-900">
                {item.label}
              </span>
              <span className="shrink-0 tabular-nums text-slate-500">
                {item.total} · {pct}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className={cn("h-full rounded-full transition-all", barColor)}
                style={{ width: `${width}%` }}
              />
            </div>
          </Link>
        );
      })}
    </div>
  );
}
