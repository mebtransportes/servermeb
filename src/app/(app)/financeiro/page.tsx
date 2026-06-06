"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  DollarSign,
  Truck,
  Building2,
  Route,
  LayoutDashboard,
  Loader2,
  Banknote,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EvolucaoMensalChart } from "@/components/financeiro/evolucao-mensal-chart";
import { fetchGraficoMensalFinanceiroGeral } from "@/lib/financeiro-dashboard";
import type { PontoGraficoMensal } from "@/lib/grafico-mensal";

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
    desc: "Comissões, manutenções, abastecimentos e despesas administrativas",
    icon: Building2,
    cor: "text-purple-400",
  },
  {
    href: "/financeiro/fechamento-viagens",
    label: "Fechamento de Viagens",
    desc: "Comissões, despesas e holerite por motorista",
    icon: Route,
    cor: "text-emerald-400",
  },
  {
    href: "/financeiro/recebimentos",
    label: "Recebimentos",
    desc: "Valores a receber das empresas — viagens arquivadas",
    icon: Banknote,
    cor: "text-amber-400",
  },
];

export default function FinanceiroDashboardPage() {
  const [grafico, setGrafico] = useState<PontoGraficoMensal[]>([]);
  const [carregandoGrafico, setCarregandoGrafico] = useState(true);

  useEffect(() => {
    let ativo = true;
    (async () => {
      setCarregandoGrafico(true);
      const dados = await fetchGraficoMensalFinanceiroGeral();
      if (ativo) {
        setGrafico(dados);
        setCarregandoGrafico(false);
      }
    })();
    return () => {
      ativo = false;
    };
  }, []);

  return (
    <div className="space-y-8">
      <header className="flex items-center gap-3">
        <LayoutDashboard className="h-8 w-8 text-cyan-400" />
        <div>
          <h1 className="text-2xl font-bold">Financeiro</h1>
          <p className="text-slate-400">Dashboard geral — custos, fechamentos e comissões</p>
        </div>
      </header>

      {carregandoGrafico ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-700/50 bg-slate-800/30 py-16 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          Carregando evolução dos gastos…
        </div>
      ) : (
        <EvolucaoMensalChart
          dados={grafico}
          titulo="Evolução geral dos gastos"
          subtitulo="Últimos 6 meses · custos operacionais, comissões de motoristas e despesas administrativas"
          tema="cyan"
        />
      )}

      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-500">
          Acesso rápido
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modulos.map((m) => {
            const Icon = m.icon;
            return (
              <Link key={m.href} href={m.href} className="block">
                <article
                  className={cn(
                    "rounded-xl border border-slate-700/50 bg-slate-800/30 p-5 transition",
                    "hover:border-cyan-600/50 hover:bg-slate-800/60"
                  )}
                >
                  <Icon className={cn("mb-3 h-8 w-8", m.cor)} />
                  <h2 className="font-semibold text-white">{m.label}</h2>
                  <p className="mt-1 text-sm text-slate-400">{m.desc}</p>
                </article>
              </Link>
            );
          })}
        </div>
      </section>

      <p className="flex items-center gap-2 text-xs text-slate-500">
        <DollarSign className="h-4 w-4" />
        Viagens finalizadas em Acompanhamento geram fechamento automático em Fechamento de Viagens.
      </p>
    </div>
  );
}
