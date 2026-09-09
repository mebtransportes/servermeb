"use client";

import { AnexoArquivoRow } from "@/components/shared/anexo-arquivo-row";
import type { CampoAnexoFrota, FrotaAnexo } from "@/lib/anexos-crud";

export type AnexosInfo = {
  nota_fiscal_path?: string | null;
  nota_fiscal_nome?: string | null;
  comprovante_path?: string | null;
  comprovante_nome?: string | null;
};

export function FrotaAnexosLinks({
  anexos,
  listaAnexos,
  onExcluir,
  excluindoCampo,
  excluindoId,
}: {
  anexos?: AnexosInfo;
  listaAnexos?: FrotaAnexo[];
  onExcluir?: (campo: CampoAnexoFrota, path: string) => void | Promise<void>;
  onExcluirMultiplo?: (anexo: FrotaAnexo) => void | Promise<void>;
  excluindoCampo?: CampoAnexoFrota | null;
  excluindoId?: string | null;
}) {
  const temLista = listaAnexos && listaAnexos.length > 0;
  const temLegado =
    anexos && (anexos.nota_fiscal_path || anexos.comprovante_path);

  if (!temLista && !temLegado) return null;

  const idsExibidos = new Set<string>();
  const todos: { id: string; label: string; path: string; tipo: CampoAnexoFrota; legado: boolean }[] = [];

  if (listaAnexos) {
    for (const a of listaAnexos) {
      if (idsExibidos.has(a.id)) continue;
      idsExibidos.add(a.id);
      todos.push({
        id: a.id,
        label: a.tipo === "nota_fiscal" ? `Nota fiscal · ${a.file_name}` : `Comprovante · ${a.file_name}`,
        path: a.storage_path,
        tipo: a.tipo,
        legado: a.id.startsWith("legado-"),
      });
    }
  }

  if (anexos) {
    if (anexos.nota_fiscal_path) {
      const idLegado = "legado-nf-virtual";
      if (!idsExibidos.has(idLegado)) {
        idsExibidos.add(idLegado);
        todos.push({
          id: idLegado,
          label: anexos.nota_fiscal_nome ?? "Nota fiscal",
          path: anexos.nota_fiscal_path,
          tipo: "nota_fiscal",
          legado: true,
        });
      }
    }
    if (anexos.comprovante_path) {
      const idLegado = "legado-comp-virtual";
      if (!idsExibidos.has(idLegado)) {
        idsExibidos.add(idLegado);
        todos.push({
          id: idLegado,
          label: anexos.comprovante_nome ?? "Comprovante",
          path: anexos.comprovante_path,
          tipo: "comprovante",
          legado: true,
        });
      }
    }
  }

  return (
    <div className="space-y-2">
      {todos.map((a) => (
        <AnexoArquivoRow
          key={a.id}
          label={a.label}
          storagePath={a.path}
          onExcluir={
            onExcluir
              ? () => onExcluir(a.tipo, a.path)
              : undefined
          }
          excluindo={
            (a.legado && excluindoCampo === a.tipo) ||
            (!a.legado && excluindoId === a.id)
          }
        />
      ))}
    </div>
  );
}
