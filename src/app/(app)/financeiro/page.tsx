"use client";

import Link from "next/link";
import {
  DollarSign,
  Truck,
  Building2,
  Route,
  Wallet,
  LayoutDashboard,
} from "lucide-react";
import { cn } from "@/lib/utils";

const modulos = [
  {
    href: "/financeiro/custos-operacionais",
    label: "Custos Operacionais",
    desc: "Abastecimentos, manutenções e despesas de viagem por período",
    icon: Truck,
    cor: "text-cyan-400",
  },
  {
    href: "/financeiro/custos-empresariais",
    label: "Custos Empresariais",
    desc: "Despesas administrativas e corporativas (em breve)",
    icon: Building2,
    cor: "text-purple-400",
    emBreve: true,
  },
  {
    href: "/financeiro/fechamento-viagens",
    label: "Fechamento de Viagens",
    desc: "Comissões, despesas e holerite por motorista",
    icon: Route,
    cor: "text-emerald-400",
  },
  {
    href: "/financeiro/controle-gastos",
    label: "Controle de Gastos",
    desc: "Acompanhamento detalhado de gastos (em breve)",
    icon: Wallet,
    cor: "text-amber-400",
    emBreve: true,
  },
];

export default function FinanceiroDashboardPage() {
  return (
    <div className="space-y-8">
      <header className="flex items-center gap-3">
        <LayoutDashboard className="h-8 w-8 text-cyan-400" />
        <div>
          <h1 className="text-2xl font-bold">Financeiro</h1>
          <p className="text-slate-400">Dashboard geral — custos, fechamentos e comissões</p>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        {modulos.map((m) => {
          const Icon = m.icon;
          const content = (
            <article
              className={cn(
                "rounded-xl border border-slate-700/50 bg-slate-800/30 p-5 transition",
                !m.emBreve && "hover:border-cyan-600/50 hover:bg-slate-800/60"
              )}
            >
              <Icon className={cn("mb-3 h-8 w-8", m.cor)} />
              <h2 className="font-semibold text-white">{m.label}</h2>
              <p className="mt-1 text-sm text-slate-400">{m.desc}</p>
              {m.emBreve && (
                <span className="mt-3 inline-block rounded bg-slate-700 px-2 py-0.5 text-xs text-slate-300">
                  Em breve
                </span>
              )}
            </article>
          );

          if (m.emBreve) {
            return <div key={m.href}>{content}</div>;
          }
          return (
            <Link key={m.href} href={m.href} className="block">
              {content}
            </Link>
          );
        })}
      </div>

      <p className="flex items-center gap-2 text-xs text-slate-500">
        <DollarSign className="h-4 w-4" />
        Viagens finalizadas em Acompanhamento geram fechamento automático em Fechamento de Viagens.
      </p>
    </div>
  );
}
