import { createClient } from "@/lib/supabase/client";
import { deleteFile, uploadFile } from "@/lib/storage";

export type TabelaAnexoFrota =
  | "viagem_recursos"
  | "frota_manutencoes"
  | "frota_abastecimentos";

export type CampoAnexoFrota = "nota_fiscal" | "comprovante";

export type TabelaAnexoFrotaMultipla =
  | "viagem_recurso_anexos"
  | "frota_manutencao_anexos"
  | "frota_abastecimento_anexos";

export type FrotaAnexo = {
  id: string;
  tipo: CampoAnexoFrota;
  storage_path: string;
  file_name: string;
  mime_type?: string | null;
  created_at?: string;
};

const MAP_TABELA_PARA_TABELA_ANEXO: Record<TabelaAnexoFrota, TabelaAnexoFrotaMultipla> = {
  viagem_recursos: "viagem_recurso_anexos",
  frota_manutencoes: "frota_manutencao_anexos",
  frota_abastecimentos: "frota_abastecimento_anexos",
};

const MAP_TABELA_PARA_FK: Record<TabelaAnexoFrota, string> = {
  viagem_recursos: "recurso_id",
  frota_manutencoes: "manutencao_id",
  frota_abastecimentos: "abastecimento_id",
};

export async function excluirAnexoTabela(
  tabela: "veiculo_anexos" | "motorista_anexos" | "viagem_anexos",
  id: string,
  storagePath: string
): Promise<string | null> {
  if (storagePath) await deleteFile(storagePath);
  const supabase = createClient();
  const { error } = await supabase.from(tabela).delete().eq("id", id);
  return error?.message ?? null;
}

export async function excluirAnexoFrotaInline(
  tabela: TabelaAnexoFrota,
  registroId: string,
  campo: CampoAnexoFrota,
  storagePath: string
): Promise<string | null> {
  if (storagePath) await deleteFile(storagePath);
  const supabase = createClient();
  const update =
    campo === "nota_fiscal"
      ? { nota_fiscal_path: null, nota_fiscal_nome: null }
      : { comprovante_path: null, comprovante_nome: null };
  const { error } = await supabase.from(tabela).update(update).eq("id", registroId);
  return error?.message ?? null;
}

export async function listarAnexosFrota(
  tabela: TabelaAnexoFrota,
  registroId: string
): Promise<FrotaAnexo[]> {
  const supabase = createClient();
  const tabelaAnexo = MAP_TABELA_PARA_TABELA_ANEXO[tabela];
  const fk = MAP_TABELA_PARA_FK[tabela];

  const { data, error } = await supabase
    .from(tabelaAnexo)
    .select("id, tipo, storage_path, file_name, mime_type, created_at")
    .eq(fk, registroId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("listarAnexosFrota:", error);
    return [];
  }

  const legados = await listarAnexosLegadosFrota(tabela, registroId);
  return [...(data ?? []), ...legados];
}

async function listarAnexosLegadosFrota(
  tabela: TabelaAnexoFrota,
  registroId: string
): Promise<FrotaAnexo[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from(tabela)
    .select("nota_fiscal_path, nota_fiscal_nome, comprovante_path, comprovante_nome")
    .eq("id", registroId)
    .maybeSingle();

  if (error || !data) return [];

  const lista: FrotaAnexo[] = [];
  if (data.nota_fiscal_path) {
    lista.push({
      id: `legado-nf-${registroId}`,
      tipo: "nota_fiscal",
      storage_path: data.nota_fiscal_path as string,
      file_name: (data.nota_fiscal_nome as string) || "Nota Fiscal",
    });
  }
  if (data.comprovante_path) {
    lista.push({
      id: `legado-comp-${registroId}`,
      tipo: "comprovante",
      storage_path: data.comprovante_path as string,
      file_name: (data.comprovante_nome as string) || "Comprovante",
    });
  }
  return lista;
}

export async function salvarAnexosFrotaMultiplos(
  tabela: TabelaAnexoFrota,
  registroId: string,
  tipo: CampoAnexoFrota,
  files: File[],
  folder: string
): Promise<string | null> {
  if (!files.length) return null;
  const supabase = createClient();
  const tabelaAnexo = MAP_TABELA_PARA_TABELA_ANEXO[tabela];
  const fk = MAP_TABELA_PARA_FK[tabela];

  for (const file of files) {
    const up = await uploadFile(file, folder);
    if (!up) return `Falha ao enviar "${file.name}"`;
    const { error } = await supabase.from(tabelaAnexo).insert({
      [fk]: registroId,
      tipo,
      storage_path: up.path,
      file_name: up.fileName,
      mime_type: up.mimeType,
    });
    if (error) return error.message;
  }
  return null;
}

export async function excluirAnexoFrotaMultiplo(
  tabela: TabelaAnexoFrota,
  anexoId: string,
  storagePath: string
): Promise<string | null> {
  if (!anexoId.startsWith("legado-")) {
    if (storagePath) await deleteFile(storagePath);
    const supabase = createClient();
    const tabelaAnexo = MAP_TABELA_PARA_TABELA_ANEXO[tabela];
    const { error } = await supabase.from(tabelaAnexo).delete().eq("id", anexoId);
    return error?.message ?? null;
  }
  return null;
}

export async function contarAnexosFrotaPorTipo(
  tabela: TabelaAnexoFrota,
  registroId: string
): Promise<{ nota_fiscal: number; comprovante: number }> {
  const anexos = await listarAnexosFrota(tabela, registroId);
  return {
    nota_fiscal: anexos.filter((a) => a.tipo === "nota_fiscal").length,
    comprovante: anexos.filter((a) => a.tipo === "comprovante").length,
  };
}
