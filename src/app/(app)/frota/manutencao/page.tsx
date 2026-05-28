"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Wrench, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PeriodoFilter } from "@/components/frota/periodo-filter";
import { StatsCards, buildManutencaoStats } from "@/components/frota/stats-cards";
import { ManutencaoKanban } from "@/components/frota/manutencao-kanban";
import { ManutencaoForm } from "@/components/frota/manutencao-form";
import { fetchManutencoes } from "@/lib/frota-data";
import { dataNoPeriodo, PERIODOS, type PeriodoFiltro } from "@/lib/frota-filters";
import type { FrotaManutencaoStatus, ManutencaoCard } from "@/types/frota";

export default function FrotaManutencaoPage() {
  const [items, setItems] = useState<ManutencaoCard[]>([]);
  const [periodo, setPeriodo] = useState<PeriodoFiltro>("mes");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [statusForm, setStatusForm] = useState<FrotaManutencaoStatus>("AGENDADO");

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetchManutencoes();
    setItems(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtrados = useMemo(
    () =>
      items.filter((i) => {
        const ref = i.dataRef.includes("T") ? i.dataRef : `${i.dataRef}T12:00:00`;
        return dataNoPeriodo(ref, periodo);
      }),
    [items, periodo]
  );

  const periodoLabel = PERIODOS.find((p) => p.value === periodo)?.label ?? "";
  const stats = buildManutencaoStats(
    filtrados.map((i) => ({ valor: i.valor, source: i.source, status: i.status })),
    periodoLabel
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Wrench className="h-8 w-8 text-cyan-400" />
          <div>
            <h1 className="text-2xl font-bold">Manutenção</h1>
            <p className="text-slate-400">
              Arraste entre colunas · Preventivas e viagens integradas
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              setStatusForm("AGENDADO");
              setShowForm(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Nova manutenção
          </Button>
        </div>
      </header>

      <PeriodoFilter value={periodo} onChange={setPeriodo} />
      <StatsCards stats={stats} />

      {showForm && (
        <ManutencaoForm
          statusInicial={statusForm}
          onSaved={() => {
            setShowForm(false);
            load();
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      <p className="text-xs text-slate-500">
        Arraste os cards entre Agendado, Em andamento e Finalizado para atualizar o status.
      </p>

      {loading ? (
        <p className="text-slate-400">Carregando...</p>
      ) : (
        <ManutencaoKanban items={filtrados} onMoved={load} />
      )}
    </div>
  );
}
