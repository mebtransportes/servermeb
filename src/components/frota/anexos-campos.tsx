"use client";

import { useState } from "react";
import { FileUploadField } from "@/components/ui/file-upload";
import { FrotaAnexosLinks, type AnexosInfo } from "@/components/frota/frota-anexos-links";
import {
  excluirAnexoFrotaInline,
  type CampoAnexoFrota,
  type TabelaAnexoFrota,
} from "@/lib/anexos-crud";
import { mebAlert, mebConfirm } from "@/lib/meb-dialog";

export function AnexosFrotaCampos({
  notaFiscal,
  comprovante,
  onNotaFiscalChange,
  onComprovanteChange,
  existentes,
  registro,
  onAnexoExcluido,
}: {
  notaFiscal: File | null;
  comprovante: File | null;
  onNotaFiscalChange: (f: File | null) => void;
  onComprovanteChange: (f: File | null) => void;
  existentes?: AnexosInfo;
  /** Quando informado, exclusão persiste no banco imediatamente. */
  registro?: { tabela: TabelaAnexoFrota; id: string };
  onAnexoExcluido?: (atualizado: AnexosInfo) => void;
}) {
  const [excluindoCampo, setExcluindoCampo] = useState<CampoAnexoFrota | null>(null);
  const [locais, setLocais] = useState<AnexosInfo | undefined>(existentes);

  const anexosAtuais = locais ?? existentes;

  async function handleExcluir(campo: CampoAnexoFrota, path: string) {
    if (
      !(await mebConfirm("Excluir este documento?", {
        variant: "danger",
        confirmLabel: "Excluir",
      }))
    ) {
      return;
    }
    setExcluindoCampo(campo);

    if (registro) {
      const err = await excluirAnexoFrotaInline(registro.tabela, registro.id, campo, path);
      if (err) {
        await mebAlert(err);
        setExcluindoCampo(null);
        return;
      }
    }

    const base = { ...(locais ?? existentes ?? {}) };
    if (campo === "nota_fiscal") {
      base.nota_fiscal_path = null;
      base.nota_fiscal_nome = null;
    } else {
      base.comprovante_path = null;
      base.comprovante_nome = null;
    }
    setLocais(base);
    onAnexoExcluido?.(base);
    setExcluindoCampo(null);
  }

  return (
    <div className="space-y-3">
      {anexosAtuais && (anexosAtuais.nota_fiscal_path || anexosAtuais.comprovante_path) && (
        <div>
          <p className="mb-2 text-sm text-slate-400">Documentos anexados</p>
          <FrotaAnexosLinks
            anexos={anexosAtuais}
            onExcluir={handleExcluir}
            excluindoCampo={excluindoCampo}
          />
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <FileUploadField
          label="Nota fiscal (opcional)"
          file={notaFiscal}
          onChange={onNotaFiscalChange}
          hint="PDF ou imagem"
        />
        <FileUploadField
          label="Comprovante de pagamento (opcional)"
          file={comprovante}
          onChange={onComprovanteChange}
          hint="PDF ou imagem"
        />
      </div>
    </div>
  );
}
