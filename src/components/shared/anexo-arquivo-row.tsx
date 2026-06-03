"use client";

import { useEffect, useState } from "react";
import { FileText, Trash2 } from "lucide-react";
import { getFileUrl } from "@/lib/storage";

export function AnexoArquivoRow({
  label,
  storagePath,
  onExcluir,
  excluindo,
}: {
  label: string;
  storagePath: string;
  onExcluir?: () => void | Promise<void>;
  excluindo?: boolean;
}) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    getFileUrl(storagePath).then(setUrl);
  }, [storagePath]);

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-[#262626]/80 px-3 py-2 text-sm">
      <span className="flex min-w-0 items-center gap-2">
        <FileText className="h-4 w-4 shrink-0 text-cyan-400" />
        <span className="truncate text-slate-200">{label}</span>
      </span>
      <div className="flex shrink-0 items-center gap-2">
        {url ? (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-400 hover:underline"
          >
            Abrir
          </a>
        ) : (
          <span className="text-slate-500">…</span>
        )}
        {onExcluir && (
          <button
            type="button"
            onClick={onExcluir}
            disabled={excluindo}
            title="Excluir anexo"
            className="rounded-md p-1.5 text-red-400 transition hover:bg-red-950/50 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
