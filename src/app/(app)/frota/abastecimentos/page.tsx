"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Fuel, Plus, Route, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PeriodoFilter } from "@/components/frota/periodo-filter";
import { StatsCards, buildAbastecimentoStats } from "@/components/frota/stats-cards";
import { AbastecimentoForm } from "@/components/frota/abastecimento-form";
import { CardAcoes } from "@/components/frota/card-acoes";
import { fetchAbastecimentos } from "@/lib/frota-data";
import { excluirAbastecimento } from "@/lib/frota-crud";
import { dataNoPeriodo, formatarMoeda, PERIODOS, type PeriodoFiltro } from "@/lib/frota-filters";
import type { AbastecimentoCard } from "@/types/frota";
import { cn } from "@/lib/utils";
import { FrotaAnexosLinks } from "@/components/frota/frota-anexos-links";

export default function FrotaAbastecimentosPage() {
  const [items, setItems] = useState<AbastecimentoCard[]>([]);
  const [periodo, setPeriodo] = useState<PeriodoFiltro>("mes");
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<AbastecimentoCard | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setItems(await fetchAbastecimentos());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtrados = useMemo(
    () => items.filter((i) => dataNoPeriodo(i.dataHora, periodo)),
    [items, periodo]
  );

  const periodoLabel = PERIODOS.find((p) => p.value === periodo)?.label ?? "";
  const stats = buildAbastecimentoStats(
    filtrados.map((i) => ({ valor: i.valor, source: i.source, km: i.km })),
    periodoLabel
  );

  function abrirNovo() {
    setEditingItem(null);
    setShowForm(true);
  }

  function abrirEdicao(item: AbastecimentoCard) {
    setEditingItem(item);
    setShowForm(true);
  }

  async function handleExcluir(item: AbastecimentoCard) {
    const label = item.source === "viagem" ? "registro da viagem" : "abastecimento manual";
    if (!confirm(`Excluir este ${label}? Esta ação não pode ser desfeita.`)) return;
    const err = await excluirAbastecimento(item);
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
          <Fuel className="h-8 w-8 text-cyan-400" />
          <div>
            <h1 className="text-2xl font-bold">Abastecimentos</h1>
            <p className="text-slate-400">Manual e registros das viagens · Editar ou excluir nos cards</p>
          </div>
        </div>
        <Button onClick={abrirNovo}>
          <Plus className="h-4 w-4" />
          Novo abastecimento
        </Button>
      </header>

      <PeriodoFilter value={periodo} onChange={setPeriodo} />
      <StatsCards stats={stats} />

      {showForm && (
        <AbastecimentoForm
          item={editingItem ?? undefined}
          onSaved={() => {
            setShowForm(false);
            setEditingItem(null);
            load();
          }}
          onCancel={() => {
            setShowForm(false);
            setEditingItem(null);
          }}
        />
      )}

      {loading ? (
        <p className="text-slate-400">Carregando...</p>
      ) : filtrados.length === 0 ? (
        <p className="text-slate-500">Nenhum abastecimento no período.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtrados.map((item) => (
            <AbastecimentoCardView
              key={item.id}
              item={item}
              onEdit={() => abrirEdicao(item)}
              onDelete={() => handleExcluir(item)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AbastecimentoCardView({
  item,
  onEdit,
  onDelete,
}: {
  item: AbastecimentoCard;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-4">
      <div className="mb-2 flex items-start justify-between gap-2">
        <span className="text-lg font-bold text-emerald-400">
          {formatarMoeda(item.valor)}
        </span>
        {item.source === "viagem" ? (
          <span className="flex items-center gap-1 rounded bg-cyan-900/50 px-2 py-0.5 text-[10px] font-semibold text-cyan-300">
            <Route className="h-3 w-3" />
            Viagem
          </span>
        ) : (
          <span className="flex items-center gap-1 rounded bg-violet-900/50 px-2 py-0.5 text-[10px] font-semibold text-violet-300">
            <ClipboardList className="h-3 w-3" />
            Manual
          </span>
        )}
      </div>
      <p className="text-sm text-slate-300">
        {new Date(item.dataHora).toLocaleString("pt-BR")}
      </p>
      {(item.km != null || item.litros != null) && (
        <p className="mt-1 text-sm text-cyan-400">
          {item.km != null && `KM: ${item.km.toLocaleString("pt-BR")}`}
          {item.km != null && item.litros != null && " · "}
          {item.litros != null && `${item.litros} L`}
        </p>
      )}
      <FrotaAnexosLinks anexos={item} />
      {item.postoNome && <p className="text-sm text-slate-400">Posto: {item.postoNome}</p>}
      {item.veiculoLabel && <p className="text-sm text-slate-400">{item.veiculoLabel}</p>}
      {item.motoristaNome && (
        <p className="text-sm text-cyan-400/80">Motorista: {item.motoristaNome}</p>
      )}
      {item.descricao && (
        <p className={cn("mt-2 text-xs text-slate-500")}>{item.descricao}</p>
      )}
      <CardAcoes onEdit={onEdit} onDelete={onDelete} />
    </div>
  );
}
