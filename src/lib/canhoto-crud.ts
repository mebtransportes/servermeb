import { createClient } from "@/lib/supabase/client";
import { deleteFile, uploadFile } from "@/lib/storage";
import type { ViagemCanhoto } from "@/types/recebimento";

export async function fetchCanhotosViagem(viagemId: string): Promise<ViagemCanhoto[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("viagem_canhotos")
    .select("id, viagem_id, storage_path, file_name, mime_type, created_at")
    .eq("viagem_id", viagemId)
    .order("created_at", { ascending: false });
  if (error) {
    console.error(error);
    return [];
  }
  return (data ?? []) as ViagemCanhoto[];
}

export async function uploadCanhotos(
  viagemId: string,
  files: File[]
): Promise<string | null> {
  if (!files.length) return null;
  const supabase = createClient();
  const folder = `viagens/${viagemId}/canhotos`;

  for (const file of files) {
    const up = await uploadFile(file, folder);
    if (!up) return `Falha ao enviar "${file.name}"`;
    const { error } = await supabase.from("viagem_canhotos").insert({
      viagem_id: viagemId,
      storage_path: up.path,
      file_name: up.fileName,
      mime_type: up.mimeType,
    });
    if (error) return error.message;
  }
  return null;
}

export async function excluirCanhoto(
  id: string,
  storagePath: string
): Promise<string | null> {
  if (storagePath) await deleteFile(storagePath);
  const supabase = createClient();
  const { error } = await supabase.from("viagem_canhotos").delete().eq("id", id);
  return error?.message ?? null;
}
