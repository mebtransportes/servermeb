"use client";

import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  MapPinned,
  Route,
  Truck,
  Wrench,
} from "lucide-react";
import { cn, mebCard } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

const LINKS = [
  {
    href: "/operacional/acompanhamento",
    label: "Acompanhamento",
    desc: "Status e andamento das viagens",
    icon: MapPinned,
    cor: "text-cyan-600",
    bg: "bg-cyan-50",
  },
  {
    href: "/operacional/viagens",
    label: "Cadastro de Viagens",
    desc: "Nova viagem ou edição",
    icon: Route,
    cor: "text-indigo-600",
    bg: "bg-indigo-50",
  },
  {
    href: "/financeiro/fechamento-viagens",
    label: "Fechamento de Viagens",
    desc: "Comissões e recibos",
    icon: Banknote,
    cor: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    href: "/frota/manutencao",
    label: "Manutenção da Frota",
    desc: "Ordens e parcelas",
    icon: Wrench,
    cor: "text-amber-600",
    bg: "bg-amber-50",
  },
  {
    href: "/frota/abastecimentos",
    label: "Abastecimentos",
    desc: "Histórico de combustível",
    icon: Truck,
    cor: "text-sky-600",
    bg: "bg-sky-50",
  },
] as const;

function LinkCard({
  href,
  label,
  desc,
  icon: Icon,
  cor,
  bg,
}: {
  href: string;
  label: string;
  desc: string;
  icon: LucideIcon;
  cor: string;
  bg: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        mebCard,
        "group flex items-center gap-3 bg-white/80 p-3 transition hover:border-slate-300 hover:bg-white hover:shadow-sm"
      )}
    >
      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", bg)}>
        <Icon className={cn("h-4 w-4", cor)} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900">{label}</p>
        <p className="truncate text-xs text-slate-500">{desc}</p>
      </div>
      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-300 transition group-hover:text-slate-500" />
    </Link>
  );
}

export function DashboardAcessoRapido() {
  return (
    <div className="space-y-2">
      {LINKS.map((link) => (
        <LinkCard key={link.href} {...link} />
      ))}
    </div>
  );
}
