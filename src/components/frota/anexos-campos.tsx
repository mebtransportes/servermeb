"use client";

import { FileUploadField } from "@/components/ui/file-upload";
import { FrotaAnexosLinks } from "@/components/frota/frota-anexos-links";

export function AnexosFrotaCampos({
  notaFiscal,
  comprovante,
  onNotaFiscalChange,
  onComprovanteChange,
  existentes,
}: {
  notaFiscal: File | null;
  comprovante: File | null;
  onNotaFiscalChange: (f: File | null) => void;
  onComprovanteChange: (f: File | null) => void;
  existentes?: {
    nota_fiscal_path?: string | null;
    comprovante_path?: string | null;
    nota_fiscal_nome?: string | null;
    comprovante_nome?: string | null;
  };
}) {
  return (
    <div className="space-y-3">
      {existentes && (existentes.nota_fiscal_path || existentes.comprovante_path) && (
        <div>
          <p className="mb-1 text-xs text-slate-500">Anexos atuais (substitua enviando novo arquivo)</p>
          <FrotaAnexosLinks anexos={existentes} />
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
