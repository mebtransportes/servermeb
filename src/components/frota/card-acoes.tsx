"use client";

import { Pencil, Trash2 } from "lucide-react";

export function CardAcoes({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="mt-2 flex gap-1 border-t border-slate-700/50 pt-2"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onEdit();
        }}
        className="flex flex-1 items-center justify-center gap-1 rounded-md bg-slate-700/80 py-1 text-xs text-slate-200 hover:bg-cyan-600/80"
      >
        <Pencil className="h-3 w-3" />
        Editar
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="flex flex-1 items-center justify-center gap-1 rounded-md bg-slate-700/80 py-1 text-xs text-red-300 hover:bg-red-900/60"
      >
        <Trash2 className="h-3 w-3" />
        Excluir
      </button>
    </div>
  );
}
