"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LayoutDashboard } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ViagemStatusCards } from "@/components/dashboard/viagem-status-cards";
import { ViagensCrescimentoChart } from "@/components/dashboard/viagens-crescimento-chart";
import {
  agruparViagensGrafico,
  contarPorStatus,
  type AgrupamentoGrafico,
  type ViagemResumo,
} from "@/lib/dashboard-viagens";
import { PERIODO_FILTRO_INICIAL, type PeriodoFiltroState } from "@/lib/frota-filters";

export default function DashboardPage() {
  const [viagens, setViagens] = useState<ViagemResumo[]>([]);
  const [loading, setLoading] = useState(true);
  const [periodoGrafico, setPeriodoGrafico] =
    useState<PeriodoFiltroState>(PERIODO_FILTRO_INICIAL);
  const [agrupamento, setAgrupamento] = useState<AgrupamentoGrafico>("mes");

  const load = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("viagens")
      .select("id, status, created_at")
      .order("created_at", { ascending: false });
    setViagens((data as ViagemResumo[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => contarPorStatus(viagens), [viagens]);

  const pontosGrafico = useMemo(
    () => agruparViagensGrafico(viagens, periodoGrafico, agrupamento),
    [viagens, periodoGrafico, agrupamento]
  );

  return (
    <div className="space-y-8">
      <header className="flex items-center gap-3">
        <LayoutDashboard className="h-8 w-8 text-cyan-400" />
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400">Visão geral operacional</p>
        </div>
      </header>

      {loading ? (
        <p className="text-slate-400">Carregando...</p>
      ) : (
        <>
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Viagens ativas
            </h2>
            <ViagemStatusCards counts={counts} />
          </section>

          <section>
            <ViagensCrescimentoChart
              dados={pontosGrafico}
              periodo={periodoGrafico}
              onPeriodoChange={setPeriodoGrafico}
              agrupamento={agrupamento}
              onAgrupamentoChange={setAgrupamento}
            />
          </section>
        </>
      )}
    </div>
  );
}
