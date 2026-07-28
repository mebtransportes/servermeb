"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  Archive,
  LayoutDashboard,
  MapPinned,
  Route,
  Truck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ViagemStatusCards, ViagemStatusDistribuicao } from "@/components/dashboard/viagem-status-cards";
import { ParcelasManutencaoAvisos } from "@/components/dashboard/parcelas-manutencao-avisos";
import { DashboardAcessoRapido } from "@/components/dashboard/dashboard-acesso-rapido";
import { Logo } from "@/components/brand/logo";
import { contarPorStatus, resumoDashboard, type ViagemResumo } from "@/lib/dashboard-viagens";
import { fetchAvisosParcelasManutencao } from "@/lib/manutencao-parcelas-avisos";
import type { AvisoParcelaManutencao } from "@/lib/manutencao-parcelas-avisos";
import { cn, mebCard } from "@/lib/utils";

function KpiCard({
  label,
  valor,
  desc,
  icon: Icon,
  cor,
  bg,
}: {
  label: string;
  valor: number;
  desc: string;
  icon: typeof Activity;
  cor: string;
  bg: string;
}) {
  return (
    <div className={cn(mebCard, "flex items-start gap-3 bg-white/90 p-4 shadow-sm")}>
      <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", bg)}>
        <Icon className={cn("h-5 w-5", cor)} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-slate-900">{valor}</p>
        <p className="mt-0.5 text-xs text-slate-500">{desc}</p>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-36 rounded-2xl bg-slate-200/60" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-slate-200/60" />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="h-96 rounded-xl bg-slate-200/60 xl:col-span-2" />
        <div className="h-96 rounded-xl bg-slate-200/60" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [viagens, setViagens] = useState<ViagemResumo[]>([]);
  const [avisosParcelas, setAvisosParcelas] = useState<AvisoParcelaManutencao[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const [{ data }, avisos] = await Promise.all([
      supabase
        .from("viagens")
        .select("id, status, created_at")
        .order("created_at", { ascending: false }),
      fetchAvisosParcelasManutencao(),
    ]);
    setViagens((data as ViagemResumo[]) ?? []);
    setAvisosParcelas(avisos);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => contarPorStatus(viagens), [viagens]);
  const resumo = useMemo(() => resumoDashboard(counts), [counts]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6">
      <section
        className={cn(
          mebCard,
          "relative overflow-hidden border-cyan-200/60 bg-gradient-to-br from-cyan-50 via-white to-indigo-50/80 p-6 shadow-sm"
        )}
      >
        <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-cyan-200/30 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-10 left-1/3 h-32 w-32 rounded-full bg-indigo-200/20 blur-2xl" />

        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <LayoutDashboard className="h-6 w-6 text-cyan-600" />
              <span className="text-xs font-semibold uppercase tracking-wider text-cyan-700">
                Visão geral
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Dashboard operacional</h1>
            <p className="mt-1 max-w-xl text-sm text-slate-600">
              Acompanhe viagens por status, acesse módulos principais e clique em qualquer card para
              filtrar no acompanhamento.
            </p>
          </div>
          <Link
            href="/operacional/acompanhamento"
            className="inline-flex items-center gap-2 rounded-lg border border-cyan-200 bg-white/90 px-4 py-2.5 text-sm font-semibold text-cyan-800 shadow-sm transition hover:border-cyan-300 hover:bg-white"
          >
            <MapPinned className="h-4 w-4" />
            Ir para acompanhamento
          </Link>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total de viagens"
          valor={resumo.total}
          desc="Todas as viagens no sistema"
          icon={Truck}
          cor="text-slate-700"
          bg="bg-slate-100"
        />
        <KpiCard
          label="Em operação"
          valor={resumo.emOperacao}
          desc="Agendadas até descarga"
          icon={Route}
          cor="text-sky-700"
          bg="bg-sky-100"
        />
        <KpiCard
          label="Ativas"
          valor={resumo.ativas}
          desc="Exceto arquivadas"
          icon={Activity}
          cor="text-cyan-700"
          bg="bg-cyan-100"
        />
        <KpiCard
          label="Arquivadas"
          valor={resumo.arquivadas}
          desc="Histórico concluído"
          icon={Archive}
          cor="text-slate-600"
          bg="bg-slate-100"
        />
      </div>

      <ParcelasManutencaoAvisos avisos={avisosParcelas} />

      <div className="grid gap-6 xl:grid-cols-3 xl:items-stretch">
        <section className="flex flex-col space-y-4 xl:col-span-2">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Viagens por status</h2>
              <p className="text-sm text-slate-500">
                {resumo.pendencias > 0
                  ? `${resumo.pendencias} viagem(ns) aguardando ação (agendadas ou pagamento pendente)`
                  : "Nenhuma pendência de agendamento ou pagamento"}
              </p>
            </div>
          </div>
          <ViagemStatusCards counts={counts} />

          <div
            className={cn(
              mebCard,
              "mt-auto flex min-h-[24rem] flex-1 items-center justify-center border-dashed border-slate-200/80 bg-gradient-to-b from-white/90 to-slate-50/60 p-8 shadow-sm"
            )}
          >
            <Logo variant="dashboard" className="opacity-90" />
          </div>
        </section>

        <aside className="space-y-6">
          <section className={cn(mebCard, "space-y-4 bg-white/90 p-5 shadow-sm")}>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Distribuição</h2>
              <p className="text-xs text-slate-500">Proporção por status (clique para filtrar)</p>
            </div>
            <ViagemStatusDistribuicao counts={counts} />
          </section>

          <section className={cn(mebCard, "space-y-4 bg-white/90 p-5 shadow-sm")}>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Acesso rápido</h2>
              <p className="text-xs text-slate-500">Módulos mais usados no dia a dia</p>
            </div>
            <DashboardAcessoRapido />
          </section>
        </aside>
      </div>
    </div>
  );
}
