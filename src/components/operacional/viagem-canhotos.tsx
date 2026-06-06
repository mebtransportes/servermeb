"use client";

import { useCallback, useEffect, useState } from "react";
import { FileUploadMultiple } from "@/components/ui/file-upload";
import { Button } from "@/components/ui/button";
import { AnexoArquivoRow } from "@/components/shared/anexo-arquivo-row";
import {
  excluirCanhoto,
  fetchCanhotosViagem,
  uploadCanhotos,
} from "@/lib/canhoto-crud";
import type { ViagemCanhoto } from "@/types/recebimento";

export function ViagemCanhotos({
  viagemId,
  compact,
}: {
  viagemId: string;
  compact?: boolean;
}) {
  const [canhotos, setCanhotos] = useState<ViagemCanhoto[]>([]);
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const lista = await fetchCanhotosViagem(viagemId);
    setCanhotos(lista);
    setLoading(false);
  }, [viagemId]);

  useEffect(() => {
    load();
  }, [load]);

  async function enviar() {
    if (!arquivos.length) return;
    setEnviando(true);
    const err = await uploadCanhotos(viagemId, arquivos);
    setEnviando(false);
    if (err) {
      alert(err);
      return;
    }
    setArquivos([]);
    load();
  }

  return (
    <div className={compact ? "space-y-2" : "rounded-xl border border-slate-700/50 p-4"}>
      <h3 className={compact ? "text-xs font-semibold text-slate-400" : "mb-3 font-semibold text-cyan-400"}>
        Canhotos {canhotos.length > 0 && `(${canhotos.length})`}
      </h3>

      {loading ? (
        <p className="text-xs text-slate-500">Carregando...</p>
      ) : canhotos.length > 0 ? (
        <ul className="mb-3 space-y-1">
          {canhotos.map((c) => (
            <CanhotoRow
              key={c.id}
              canhoto={c}
              onExcluido={() => setCanhotos((prev) => prev.filter((x) => x.id !== c.id))}
            />
          ))}
        </ul>
      ) : (
        <p className="mb-2 text-xs text-slate-500">Nenhum canhoto anexado.</p>
      )}

      <FileUploadMultiple
        label={compact ? undefined : "Anexar canhotos"}
        files={arquivos}
        onChange={setArquivos}
        hint="PDF ou imagem — vários arquivos"
      />
      {arquivos.length > 0 && (
        <Button
          type="button"
          className="mt-2 h-8 text-xs"
          disabled={enviando}
          onClick={enviar}
        >
          {enviando ? "Enviando..." : `Enviar ${arquivos.length} arquivo(s)`}
        </Button>
      )}
    </div>
  );
}

function CanhotoRow({
  canhoto,
  onExcluido,
}: {
  canhoto: ViagemCanhoto;
  onExcluido: () => void;
}) {
  const [excluindo, setExcluindo] = useState(false);

  async function handleExcluir() {
    if (!confirm(`Excluir canhoto "${canhoto.file_name}"?`)) return;
    setExcluindo(true);
    const err = await excluirCanhoto(canhoto.id, canhoto.storage_path);
    setExcluindo(false);
    if (err) {
      alert(err);
      return;
    }
    onExcluido();
  }

  return (
    <li>
      <AnexoArquivoRow
        label={canhoto.file_name}
        storagePath={canhoto.storage_path}
        onExcluir={handleExcluir}
        excluindo={excluindo}
      />
    </li>
  );
}
