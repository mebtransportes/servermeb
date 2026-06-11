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
import { resumoPagamentoManutencao } from "@/lib/manutencao-pagamento";
import { cn, mebCardSm } from "@/lib/utils";
import { Shield, Route } from "lucide-react";
import { FrotaAnexosLinks } from "@/components/frota/frota-anexos-links";
import { CardAcoes } from "@/components/frota/card-acoes";

const COLUNAS: FrotaManutencaoStatus[] = ["AGENDADO", "EM ANDAMENTO", "FINALIZADO"];

const colunaStyle: Record<FrotaManutencaoStatus, string> = {
  AGENDADO: "border-amber-200 bg-amber-50/40",
  "EM ANDAMENTO": "border-sky-200 bg-sky-50/40",
  FINALIZADO: "border-emerald-200 bg-emerald-50/40",
};

function DraggableCard({
  item,
  onEdit,
  onDelete,
}: {
  item: ManutencaoCard;
  onEdit: (item: ManutencaoCard) => void;
  onDelete: (item: ManutencaoCard) => void;
}) {
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
        "cursor-grab p-3 active:cursor-grabbing",
        mebCardSm,
        isDragging && "opacity-40"
      )}
    >
      <CardContent item={item} onEdit={() => onEdit(item)} onDelete={() => onDelete(item)} />
    </div>
  );
}

function CardContent({
  item,
  onEdit,
  onDelete,
}: {
  item: ManutencaoCard;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <>
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-tight text-slate-900">{item.nome}</p>
        {item.source === "preventiva" ? (
          <span className="flex shrink-0 items-center gap-0.5 rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700">
            <Shield className="h-3 w-3" />
            Preventiva
          </span>
        ) : (
          <span className="flex shrink-0 items-center gap-0.5 rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700">
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
        <p className="mt-1 text-xs text-slate-500">Motorista: {item.motoristaNome}</p>
      )}
      {item.veiculoPlaca && (
        <p className="mt-1 text-xs font-medium text-slate-600">Veículo: {item.veiculoPlaca}</p>
      )}
      {item.km != null && (
        <p className="text-xs text-slate-500">KM: {item.km.toLocaleString("pt-BR")}</p>
      )}
      <FrotaAnexosLinks anexos={item} />
      {item.source === "preventiva" && item.pagamentoModalidade && item.pagamentoForma && (
        <p className="mt-1 text-xs text-slate-500">
          {resumoPagamentoManutencao({
            modalidade: item.pagamentoModalidade,
            forma: item.pagamentoForma,
            vencimento: item.pagamentoVencimento,
            parcelas: item.parcelas,
          })}
        </p>
      )}
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-slate-400">
          {item.dataRef}
          {item.horaRef ? ` ${item.horaRef.slice(0, 5)}` : ""}
        </span>
        <span className="font-semibold text-slate-800">{formatarMoeda(item.valor)}</span>
      </div>
      {onEdit && onDelete && <CardAcoes onEdit={onEdit} onDelete={onDelete} />}
    </>
  );
}

function DroppableColumn({
  status,
  items,
  onEdit,
  onDelete,
}: {
  status: FrotaManutencaoStatus;
  items: ManutencaoCard[];
  onEdit: (item: ManutencaoCard) => void;
  onDelete: (item: ManutencaoCard) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex min-h-[320px] flex-col rounded-xl border-2 border-dashed p-3 transition",
        colunaStyle[status],
        isOver && "ring-2 ring-emerald-300"
      )}
    >
      <h3 className="mb-3 text-center text-sm font-bold uppercase tracking-wide text-slate-600">
        {status}
        <span className="ml-2 rounded-full bg-white/80 px-2 py-0.5 text-xs text-slate-600 ring-1 ring-slate-200">
          {items.length}
        </span>
      </h3>
      <div className="flex flex-1 flex-col gap-2">
        {items.map((item) => (
          <DraggableCard key={item.id} item={item} onEdit={onEdit} onDelete={onDelete} />
        ))}
      </div>
    </div>
  );
}

export function ManutencaoKanban({
  items,
  onMoved,
  onEdit,
  onDelete,
}: {
  items: ManutencaoCard[];
  onMoved: () => void;
  onEdit: (item: ManutencaoCard) => void;
  onDelete: (item: ManutencaoCard) => void;
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
          <DroppableColumn
            key={col}
            status={col}
            items={porColuna(col)}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
      <DragOverlay>
        {active ? (
          <div className={cn(mebCardSm, "p-3 shadow-lg ring-2 ring-emerald-200")}>
            <CardContent item={active} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
