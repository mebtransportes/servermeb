"use client";

import { useCallback, useEffect, useState } from "react";
import { FileUploadMultiple } from "@/components/ui/file-upload";
import { Button } from "@/components/ui/button";
import { AnexoArquivoRow } from "@/components/shared/anexo-arquivo-row";
import {
  excluirComprovanteDescarga,
  fetchComprovantesDescargaViagem,
  uploadComprovantesDescarga,
  type ViagemComprovanteDescarga,
} from "@/lib/comprovante-descarga-crud";
import { cn, mebFormSubsection } from "@/lib/utils";
import { mebAlert, mebConfirm } from "@/lib/meb-dialog";

export function ViagemComprovantesDescarga({
  viagemId,
  compact,
}: {
  viagemId: string;
  compact?: boolean;
}) {
  const [itens, setItens] = useState<ViagemComprovanteDescarga[]>([]);
  const [arquivos, setArquivos] = useState<File[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const lista = await fetchComprovantesDescargaViagem(viagemId);
    setItens(lista);
    setLoading(false);
  }, [viagemId]);

  useEffect(() => {
    load();
  }, [load]);

  async function enviar() {
    if (!arquivos.length) return;
    setEnviando(true);
    const err = await uploadComprovantesDescarga(viagemId, arquivos);
    setEnviando(false);
    if (err) {
      await mebAlert(err);
      return;
    }
    setArquivos([]);
    load();
  }

  return (
    <div className={compact ? "space-y-2" : cn(mebFormSubsection, "space-y-3")}>
      <h3
        className={
          compact ? "text-xs font-semibold text-slate-600" : "font-semibold text-slate-800"
        }
      >
        Comprovantes de descarga {itens.length > 0 && `(${itens.length})`}
      </h3>

      {loading ? (
        <p className="text-xs text-slate-500">Carregando...</p>
      ) : itens.length > 0 ? (
        <ul className="mb-3 space-y-1">
          {itens.map((c) => (
            <ComprovanteRow
              key={c.id}
              item={c}
              onExcluido={() => setItens((prev) => prev.filter((x) => x.id !== c.id))}
            />
          ))}
        </ul>
      ) : (
        <p className="mb-2 text-xs text-slate-500">Nenhum comprovante anexado.</p>
      )}

      <FileUploadMultiple
        label={compact ? undefined : "Anexar comprovantes de descarga"}
        files={arquivos}
        onChange={setArquivos}
        hint="PDF ou imagem — vários arquivos"
      />
      {arquivos.length > 0 && (
        <Button
          type="button"
          variant="success"
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

function ComprovanteRow({
  item,
  onExcluido,
}: {
  item: ViagemComprovanteDescarga;
  onExcluido: () => void;
}) {
  const [excluindo, setExcluindo] = useState(false);

  async function handleExcluir() {
    if (
      !(await mebConfirm(`Excluir comprovante "${item.file_name}"?`, {
        variant: "danger",
        confirmLabel: "Excluir",
      }))
    ) {
      return;
    }
    setExcluindo(true);
    const err = await excluirComprovanteDescarga(item.id, item.storage_path);
    setExcluindo(false);
    if (err) {
      await mebAlert(err);
      return;
    }
    onExcluido();
  }

  return (
    <li>
      <AnexoArquivoRow
        label={item.file_name}
        storagePath={item.storage_path}
        onExcluir={handleExcluir}
        excluindo={excluindo}
      />
    </li>
  );
}
