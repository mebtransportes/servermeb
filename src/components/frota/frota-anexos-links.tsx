"use client";

import { AnexoArquivoRow } from "@/components/shared/anexo-arquivo-row";
import type { CampoAnexoFrota } from "@/lib/anexos-crud";

export type AnexosInfo = {
  nota_fiscal_path?: string | null;
  nota_fiscal_nome?: string | null;
  comprovante_path?: string | null;
  comprovante_nome?: string | null;
};

export function FrotaAnexosLinks({
  anexos,
  onExcluir,
  excluindoCampo,
}: {
  anexos: AnexosInfo;
  onExcluir?: (campo: CampoAnexoFrota, path: string) => void | Promise<void>;
  excluindoCampo?: CampoAnexoFrota | null;
}) {
  if (!anexos.nota_fiscal_path && !anexos.comprovante_path) return null;

  return (
    <div className="space-y-2">
      {anexos.nota_fiscal_path && (
        <AnexoArquivoRow
          label={anexos.nota_fiscal_nome ?? "Nota fiscal"}
          storagePath={anexos.nota_fiscal_path}
          onExcluir={
            onExcluir
              ? () => onExcluir("nota_fiscal", anexos.nota_fiscal_path!)
              : undefined
          }
          excluindo={excluindoCampo === "nota_fiscal"}
        />
      )}
      {anexos.comprovante_path && (
        <AnexoArquivoRow
          label={anexos.comprovante_nome ?? "Comprovante"}
          storagePath={anexos.comprovante_path}
          onExcluir={
            onExcluir
              ? () => onExcluir("comprovante", anexos.comprovante_path!)
              : undefined
          }
          excluindo={excluindoCampo === "comprovante"}
        />
      )}
    </div>
  );
}
