import { createClient } from "@/lib/supabase/client";
import { deleteFile } from "@/lib/storage";

export type TabelaAnexoFrota =
  | "viagem_recursos"
  | "frota_manutencoes"
  | "frota_abastecimentos";

export type CampoAnexoFrota = "nota_fiscal" | "comprovante";

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
