"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  Building2,
  Loader2,
  Route,
  Truck,
  Wallet,
} from "lucide-react";
import { cn, mebCard } from "@/lib/utils";
import { EvolucaoMensalChart } from "@/components/financeiro/evolucao-mensal-chart";
import { fetchGraficoMensalFinanceiroGeral } from "@/lib/financeiro-dashboard";
import { formatarMoeda } from "@/lib/frota-filters";
import type { PontoGraficoMensal } from "@/lib/grafico-mensal";

const modulos = [
  {
    href: "/financeiro/custos-operacionais",
    label: "Custos Operacionais",
    desc: "Abastecimentos, manutenções e despesas de viagem",
    icon: Truck,
    accent: "border-l-[#33388d]",
    iconBg: "bg-[#33388d]/10",
    iconCor: "text-[#33388d]",
  },
  {
    href: "/financeiro/custos-empresariais",
    label: "Custos Empresariais",
    desc: "Comissões, frota e despesas administrativas",
    icon: Building2,
    accent: "border-l-emerald-600",
    iconBg: "bg-emerald-50",
    iconCor: "text-emerald-700",
  },
  {
    href: "/financeiro/fechamento-viagens",
    label: "Fechamento de Viagens",
    desc: "Comissões, recibos e holerite por motorista",
    icon: Route,
    accent: "border-l-sky-600",
    iconBg: "bg-sky-50",
    iconCor: "text-sky-700",
  },
  {
    href: "/financeiro/recebimentos",
    label: "Recebimentos",
    desc: "Valores a receber das empresas contratantes",
    icon: Banknote,
    accent: "border-l-amber-600",
    iconBg: "bg-amber-50",
    iconCor: "text-amber-700",
  },
];

function resumoFinanceiro(dados: PontoGraficoMensal[]) {
  const totalPeriodo = dados.reduce((s, d) => s + d.total, 0);
  const mesAtual = dados[dados.length - 1] ?? null;
  const mesAnterior = dados.length > 1 ? dados[dados.length - 2]! : null;
  const media = dados.length ? totalPeriodo / dados.length : 0;
  const variacao =
    mesAtual && mesAnterior
      ? mesAnterior.total === 0
        ? mesAtual.total > 0
          ? 100
          : 0
        : ((mesAtual.total - mesAnterior.total) / mesAnterior.total) * 100
      : null;
  return { totalPeriodo, mesAtual, media, variacao };
}

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

  const resumo = useMemo(() => resumoFinanceiro(grafico), [grafico]);

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl bg-[#33388d] px-6 py-7 text-white shadow-sm">
        <div className="pointer-events-none absolute -right-16 top-0 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-20 left-1/4 h-40 w-40 rounded-full bg-sky-300/20 blur-2xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
              Financeiro M&B
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">Painel de custos</h1>
            <p className="mt-2 max-w-xl text-sm text-white/80">
              Acompanhe a evolução dos gastos e entre rápido nos módulos de custos,
              fechamento e recebimentos.
            </p>
          </div>
          <div className="rounded-xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur-sm">
            <p className="text-[11px] font-medium uppercase tracking-wide text-white/70">
              Mês atual
            </p>
            <p className="text-xl font-bold tabular-nums">
              {carregandoGrafico
                ? "…"
                : resumo.mesAtual
                  ? formatarMoeda(resumo.mesAtual.total)
                  : "—"}
            </p>
            {resumo.mesAtual && (
              <p className="text-xs text-white/65">{resumo.mesAtual.label}</p>
            )}
          </div>
        </div>
      </section>

      {!carregandoGrafico && grafico.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiMini
            label="Total 6 meses"
            value={formatarMoeda(resumo.totalPeriodo)}
            hint="Operacional + comissões + admin"
          />
          <KpiMini
            label="Média mensal"
            value={formatarMoeda(resumo.media)}
            hint="Média do período no gráfico"
          />
          <KpiMini
            label="Último mês"
            value={resumo.mesAtual ? formatarMoeda(resumo.mesAtual.total) : "—"}
            hint={resumo.mesAtual?.label ?? "—"}
          />
          <KpiMini
            label="Vs. mês anterior"
            value={
              resumo.variacao == null
                ? "—"
                : `${resumo.variacao > 0 ? "+" : ""}${Math.round(resumo.variacao)}%`
            }
            hint={
              resumo.variacao == null
                ? "Sem comparação"
                : resumo.variacao > 0
                  ? "Aumento de gasto"
                  : resumo.variacao < 0
                    ? "Redução de gasto"
                    : "Estável"
            }
            highlight={
              resumo.variacao == null
                ? undefined
                : resumo.variacao > 0
                  ? "up"
                  : resumo.variacao < 0
                    ? "down"
                    : "flat"
            }
          />
        </div>
      )}

      {carregandoGrafico ? (
        <div className={cn(mebCard, "flex items-center justify-center gap-2 py-16 text-slate-500")}>
          <Loader2 className="h-5 w-5 animate-spin" />
          Carregando evolução dos gastos…
        </div>
      ) : (
        <EvolucaoMensalChart
          dados={grafico}
          titulo="Evolução geral dos gastos"
          subtitulo="Últimos 6 meses · operacional, comissões e despesas administrativas"
          tema="indigo"
        />
      )}

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Módulos</h2>
            <p className="text-sm text-slate-500">Escolha o fluxo financeiro</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {modulos.map((m, i) => {
            const Icon = m.icon;
            return (
              <Link key={m.href} href={m.href} className="group block">
                <article
                  className={cn(
                    mebCard,
                    "flex items-center gap-4 border-l-4 bg-white/90 p-4 shadow-sm transition",
                    "hover:-translate-y-0.5 hover:bg-white hover:shadow-md",
                    m.accent
                  )}
                >
                  <span className="text-sm font-bold tabular-nums text-slate-300">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                      m.iconBg
                    )}
                  >
                    <Icon className={cn("h-5 w-5", m.iconCor)} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-slate-900">{m.label}</h3>
                    <p className="mt-0.5 text-sm text-slate-500">{m.desc}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" />
                </article>
              </Link>
            );
          })}
        </div>
      </section>

      <p className="flex items-center gap-2 text-xs text-slate-500">
        <Wallet className="h-4 w-4" />
        Viagens finalizadas no Acompanhamento geram fechamento automático em Fechamento de
        Viagens.
      </p>
    </div>
  );
}

function KpiMini({
  label,
  value,
  hint,
  highlight,
}: {
  label: string;
  value: string;
  hint: string;
  highlight?: "up" | "down" | "flat";
}) {
  return (
    <div className={cn(mebCard, "bg-white/90 p-4 shadow-sm")}>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p
        className={cn(
          "mt-1 text-xl font-bold tracking-tight tabular-nums",
          highlight === "up" && "text-amber-700",
          highlight === "down" && "text-emerald-700",
          !highlight && "text-slate-900"
        )}
      >
        {value}
      </p>
      <p className="mt-0.5 truncate text-xs text-slate-500">{hint}</p>
    </div>
  );
}
