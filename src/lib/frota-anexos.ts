import { uploadFile } from "@/lib/storage";

export async function salvarAnexosFrota(
  folder: string,
  notaFiscal: File | null,
  comprovante: File | null
) {
  let nota_fiscal_path: string | null = null;
  let nota_fiscal_nome: string | null = null;
  let comprovante_path: string | null = null;
  let comprovante_nome: string | null = null;

  if (notaFiscal) {
    const up = await uploadFile(notaFiscal, `${folder}/nota-fiscal`);
    if (up) {
      nota_fiscal_path = up.path;
      nota_fiscal_nome = up.fileName;
    }
  }

  if (comprovante) {
    const up = await uploadFile(comprovante, `${folder}/comprovante`);
    if (up) {
      comprovante_path = up.path;
      comprovante_nome = up.fileName;
    }
  }

  return { nota_fiscal_path, nota_fiscal_nome, comprovante_path, comprovante_nome };
}
