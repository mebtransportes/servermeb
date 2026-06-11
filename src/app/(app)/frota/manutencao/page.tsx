"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Wrench, Plus, FileBarChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PeriodoFilter } from "@/components/frota/periodo-filter";
import { StatsCards, buildManutencaoStats } from "@/components/frota/stats-cards";
import { ManutencaoKanban } from "@/components/frota/manutencao-kanban";
import { ManutencaoAlertas } from "@/components/frota/manutencao-alertas";
import {
  ManutencaoForm,
  type ManutencaoFormPrefill,
} from "@/components/frota/manutencao-form";
import { FrotaRelatorioModal } from "@/components/frota/frota-relatorio-modal";
import { fetchManutencoes } from "@/lib/frota-data";
import { excluirManutencao } from "@/lib/frota-crud";
import {
  dataNoPeriodoConfig,
  labelPeriodoConfig,
  PERIODO_FILTRO_INICIAL,
  type PeriodoFiltroState,
} from "@/lib/frota-filters";
import type { FrotaManutencaoStatus, ManutencaoCard } from "@/types/frota";

export default function FrotaManutencaoPage() {
  const [items, setItems] = useState<ManutencaoCard[]>([]);
  const [periodo, setPeriodo] = useState<PeriodoFiltroState>(PERIODO_FILTRO_INICIAL);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<ManutencaoCard | null>(null);
  const [statusForm, setStatusForm] = useState<FrotaManutencaoStatus>("AGENDADO");
  const [showRelatorio, setShowRelatorio] = useState(false);
  const [formPrefill, setFormPrefill] = useState<ManutencaoFormPrefill | undefined>();

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
        return dataNoPeriodoConfig(ref, periodo);
      }),
    [items, periodo]
  );

  const periodoLabel = labelPeriodoConfig(periodo);
  const stats = buildManutencaoStats(
    filtrados.map((i) => ({ valor: i.valor, source: i.source, status: i.status })),
    periodoLabel
  );

  function abrirNovo(prefill?: ManutencaoFormPrefill) {
    setEditingItem(null);
    setStatusForm("AGENDADO");
    setFormPrefill(prefill);
    setShowForm(true);
  }

  function abrirEdicao(item: ManutencaoCard) {
    setEditingItem(item);
    setFormPrefill(undefined);
    setShowForm(true);
  }

  async function handleExcluir(item: ManutencaoCard) {
    const label = item.source === "viagem" ? "registro da viagem" : "manutenção preventiva";
    if (!confirm(`Excluir esta ${label}? Esta ação não pode ser desfeita.`)) return;
    const err = await excluirManutencao(item);
    if (err) {
      alert(err);
      return;
    }
    if (editingItem?.id === item.id) {
      setShowForm(false);
      setEditingItem(null);
    }
    load();
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Wrench className="h-8 w-8 text-cyan-400" />
          <div>
            <h1 className="text-2xl font-bold">Manutenção</h1>
            <p className="text-slate-400">
              Arraste entre colunas · Edite ou exclua nos cards
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setShowRelatorio(true)}>
            <FileBarChart className="h-4 w-4" />
            Relatórios
          </Button>
          <Button variant="secondary" onClick={() => abrirNovo()}>
            <Plus className="h-4 w-4" />
            Nova manutenção
          </Button>
        </div>
      </header>

      {!loading && (
        <ManutencaoAlertas itens={items} onAgendar={(p) => abrirNovo(p)} />
      )}

      <PeriodoFilter value={periodo} onChange={setPeriodo} />
      <StatsCards stats={stats} />

      {showForm && (
        <ManutencaoForm
          item={editingItem ?? undefined}
          prefill={editingItem ? undefined : formPrefill}
          statusInicial={editingItem?.status ?? statusForm}
          onSaved={() => {
            setShowForm(false);
            setEditingItem(null);
            setFormPrefill(undefined);
            load();
          }}
          onCancel={() => {
            setShowForm(false);
            setEditingItem(null);
            setFormPrefill(undefined);
          }}
        />
      )}

      <p className="text-xs text-slate-500">
        Arraste os cards entre Agendado, Em andamento e Finalizado para atualizar o status.
      </p>

      <FrotaRelatorioModal
        tipo="manutencao"
        itens={items}
        open={showRelatorio}
        onClose={() => setShowRelatorio(false)}
      />

      {loading ? (
        <p className="text-slate-400">Carregando...</p>
      ) : (
        <ManutencaoKanban
          items={filtrados}
          onMoved={load}
          onEdit={abrirEdicao}
          onDelete={handleExcluir}
        />
      )}
    </div>
  );
}
