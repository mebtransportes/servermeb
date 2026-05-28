"use client";

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from "@dnd-kit/core";
import { useDraggable } from "@dnd-kit/core";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { FrotaManutencaoStatus, ManutencaoCard } from "@/types/frota";
import { formatarMoeda } from "@/lib/frota-filters";
import { cn } from "@/lib/utils";
import { Shield, Route } from "lucide-react";

const COLUNAS: FrotaManutencaoStatus[] = ["AGENDADO", "EM ANDAMENTO", "FINALIZADO"];

const colunaStyle: Record<FrotaManutencaoStatus, string> = {
  AGENDADO: "border-amber-700/50 bg-amber-950/20",
  "EM ANDAMENTO": "border-blue-700/50 bg-blue-950/20",
  FINALIZADO: "border-emerald-700/50 bg-emerald-950/20",
};

function DraggableCard({ item }: { item: ManutencaoCard }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: item.id });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "cursor-grab rounded-lg border border-slate-600/50 bg-slate-800/80 p-3 shadow active:cursor-grabbing",
        isDragging && "opacity-40"
      )}
    >
      <CardContent item={item} />
    </div>
  );
}

function CardContent({ item }: { item: ManutencaoCard }) {
  return (
    <>
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="font-medium text-white text-sm leading-tight">{item.nome}</p>
        {item.source === "preventiva" ? (
          <span className="flex shrink-0 items-center gap-0.5 rounded bg-violet-900/60 px-1.5 py-0.5 text-[10px] font-semibold text-violet-300">
            <Shield className="h-3 w-3" />
            Preventiva
          </span>
        ) : (
          <span className="flex shrink-0 items-center gap-0.5 rounded bg-cyan-900/60 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-300">
            <Route className="h-3 w-3" />
            Viagem
          </span>
        )}
      </div>
      {item.descricao && (
        <p className="mb-1 line-clamp-2 text-xs text-slate-400">{item.descricao}</p>
      )}
      <p className="text-xs text-slate-500">{item.onde}</p>
      {item.motoristaNome && (
        <p className="mt-1 text-xs text-cyan-400/80">Motorista: {item.motoristaNome}</p>
      )}
      {item.veiculoPlaca && (
        <p className="text-xs text-slate-500">Veículo: {item.veiculoPlaca}</p>
      )}
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-slate-400">
          {item.dataRef}
          {item.horaRef ? ` ${item.horaRef.slice(0, 5)}` : ""}
        </span>
        <span className="font-semibold text-emerald-400">{formatarMoeda(item.valor)}</span>
      </div>
    </>
  );
}

function DroppableColumn({
  status,
  items,
}: {
  status: FrotaManutencaoStatus;
  items: ManutencaoCard[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-[320px] flex-col rounded-xl border-2 border-dashed p-3 transition",
        colunaStyle[status],
        isOver && "ring-2 ring-cyan-400"
      )}
    >
      <h3 className="mb-3 text-center text-sm font-bold uppercase tracking-wide text-slate-300">
        {status}
        <span className="ml-2 rounded-full bg-slate-800 px-2 py-0.5 text-xs">
          {items.length}
        </span>
      </h3>
      <div className="flex flex-1 flex-col gap-2">
        {items.map((item) => (
          <DraggableCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

export function ManutencaoKanban({
  items,
  onMoved,
}: {
  items: ManutencaoCard[];
  onMoved: () => void;
}) {
  const [active, setActive] = useState<ManutencaoCard | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  async function updateStatus(item: ManutencaoCard, status: FrotaManutencaoStatus) {
    const supabase = createClient();
    if (item.source === "preventiva" && item.frotaId) {
      await supabase.from("frota_manutencoes").update({ status }).eq("id", item.frotaId);
    } else if (item.viagemRecursoId) {
      await supabase
        .from("viagem_recursos")
        .update({ status_frota: status })
        .eq("id", item.viagemRecursoId);
    }
    onMoved();
  }

  function handleDragEnd(event: DragEndEvent) {
    setActive(null);
    const { active: dragId, over } = event;
    if (!over) return;

    const item = items.find((i) => i.id === dragId.id);
    const newStatus = over.id as FrotaManutencaoStatus;
    if (!item || !COLUNAS.includes(newStatus) || item.status === newStatus) return;

    updateStatus(item, newStatus);
  }

  function handleDragStart(event: DragStartEvent) {
    const item = items.find((i) => i.id === event.active.id);
    setActive(item ?? null);
  }

  const porColuna = (s: FrotaManutencaoStatus) =>
    items.filter((i) => i.status === s);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid gap-4 lg:grid-cols-3">
        {COLUNAS.map((col) => (
          <DroppableColumn key={col} status={col} items={porColuna(col)} />
        ))}
      </div>
      <DragOverlay>
        {active ? (
          <div className="rounded-lg border border-cyan-500 bg-slate-800 p-3 shadow-xl">
            <CardContent item={active} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
