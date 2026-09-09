"use client";

import { useEffect, useState } from "react";
import { FileUploadMultiple } from "@/components/ui/file-upload";
import { FrotaAnexosLinks, type AnexosInfo } from "@/components/frota/frota-anexos-links";
import {
  excluirAnexoFrotaInline,
  excluirAnexoFrotaMultiplo,
  listarAnexosFrota,
  type CampoAnexoFrota,
  type FrotaAnexo,
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
  notaFiscal: File[];
  comprovante: File[];
  onNotaFiscalChange: (f: File[]) => void;
  onComprovanteChange: (f: File[]) => void;
  existentes?: AnexosInfo;
  registro?: { tabela: TabelaAnexoFrota; id: string };
  onAnexoExcluido?: (atualizado: AnexosInfo) => void;
}) {
  const [excluindoCampo, setExcluindoCampo] = useState<CampoAnexoFrota | null>(null);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);
  const [locais, setLocais] = useState<AnexosInfo | undefined>(existentes);
  const [listaAnexos, setListaAnexos] = useState<FrotaAnexo[]>([]);
  const [carregando, setCarregando] = useState(!!registro);

  const anexosAtuais = locais ?? existentes;

  useEffect(() => {
    if (!registro) {
      setCarregando(false);
      return;
    }
    listarAnexosFrota(registro.tabela, registro.id).then((lista) => {
      setListaAnexos(lista);
      setCarregando(false);
    });
  }, [registro?.tabela, registro?.id]);

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

    if (registro) {
      const lista = await listarAnexosFrota(registro.tabela, registro.id);
      setListaAnexos(lista);
    }
  }

  async function handleExcluirMultiplo(anexo: FrotaAnexo) {
    if (
      !(await mebConfirm(`Excluir "${anexo.file_name}"?`, {
        variant: "danger",
        confirmLabel: "Excluir",
      }))
    ) {
      return;
    }
    setExcluindoId(anexo.id);
    if (registro) {
      const err = await excluirAnexoFrotaMultiplo(registro.tabela, anexo.id, anexo.storage_path);
      if (err) {
        await mebAlert(err);
        setExcluindoId(null);
        return;
      }
    }
    setListaAnexos((prev) => prev.filter((a) => a.id !== anexo.id));
    setExcluindoId(null);
  }

  return (
    <div className="space-y-3">
      {(anexosAtuais?.nota_fiscal_path || anexosAtuais?.comprovante_path || listaAnexos.length > 0) && (
        <div>
          <p className="mb-2 text-sm text-slate-400">Documentos anexados</p>
          {carregando ? (
            <p className="text-xs text-slate-500">Carregando anexos...</p>
          ) : (
            <FrotaAnexosLinks
              anexos={anexosAtuais}
              listaAnexos={listaAnexos}
              onExcluir={handleExcluir}
              onExcluirMultiplo={handleExcluirMultiplo}
              excluindoCampo={excluindoCampo}
              excluindoId={excluindoId}
            />
          )}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <FileUploadMultiple
          label="Notas fiscais (opcional)"
          files={notaFiscal}
          onChange={onNotaFiscalChange}
          hint="PDF ou imagem — selecione vários"
        />
        <FileUploadMultiple
          label="Comprovantes de pagamento (opcional)"
          files={comprovante}
          onChange={onComprovanteChange}
          hint="PDF ou imagem — selecione vários"
        />
      </div>
    </div>
  );
}
