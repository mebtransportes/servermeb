import { createClient } from "@/lib/supabase/client";

const BUCKET = "meb-documentos";

export async function uploadFile(
  file: File,
  folder: string
): Promise<{ path: string; fileName: string; mimeType: string } | null> {
  const supabase = createClient();
  const ext = file.name.split(".").pop() || "bin";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });

  if (error) {
    console.error(error);
    return null;
  }

  return { path, fileName: file.name, mimeType: file.type };
}

/** @deprecated use uploadFile */
export async function uploadPdf(file: File, folder: string) {
  return uploadFile(file, folder);
}

export async function getFileUrl(path: string): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, 3600);
  if (error) return null;
  return data.signedUrl;
}

/** @deprecated use getFileUrl */
export const getPdfUrl = getFileUrl;

export async function deleteFile(path: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  return !error;
}

/** @deprecated use deleteFile */
export const deletePdf = deleteFile;
