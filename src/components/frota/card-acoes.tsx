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
      className="mt-2 flex gap-1 border-t border-slate-200/80 pt-2"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onEdit();
        }}
        className="flex flex-1 items-center justify-center gap-1 rounded-md border border-slate-200 bg-white/80 py-1 text-xs text-slate-600 hover:border-slate-300 hover:bg-white"
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
        className="flex flex-1 items-center justify-center gap-1 rounded-md border border-red-200 bg-red-50 py-1 text-xs text-red-700 hover:bg-red-100"
      >
        <Trash2 className="h-3 w-3" />
        Excluir
      </button>
    </div>
  );
}
