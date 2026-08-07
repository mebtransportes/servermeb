import { createClient } from "@/lib/supabase/client";

const BUCKET = "meb-documentos";

/** Lado maior máximo (mantém proporção). */
const IMAGE_MAX_EDGE = 1920;
/** Qualidade WebP — visual bom, arquivo bem menor. */
const IMAGE_QUALITY = 0.82;
/** Não comprime se já for pequeno. */
const IMAGE_MIN_BYTES_TO_COMPRESS = 180_000;

function isBrowserImageCompressable(file: File): boolean {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return false;
  }
  const t = file.type.toLowerCase();
  if (!t.startsWith("image/")) return false;
  // GIF animado perde frames se reencode — deixa como está
  if (t === "image/gif") return false;
  return true;
}

/**
 * Comprime imagens no browser (resize + WebP).
 * Se a versão comprimida não for menor, devolve o arquivo original.
 */
export async function compressImageForUpload(file: File): Promise<File> {
  if (!isBrowserImageCompressable(file)) return file;
  if (file.size < IMAGE_MIN_BYTES_TO_COMPRESS) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(
      1,
      IMAGE_MAX_EDGE / Math.max(bitmap.width, bitmap.height)
    );
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/webp", IMAGE_QUALITY);
    });

    if (!blob || blob.size >= file.size * 0.95) {
      return file;
    }

    const baseName = file.name.replace(/\.[^.]+$/, "") || "imagem";
    return new File([blob], `${baseName}.webp`, {
      type: "image/webp",
      lastModified: Date.now(),
    });
  } catch (err) {
    console.warn("Falha ao comprimir imagem; enviando original.", err);
    return file;
  }
}

export async function uploadFile(
  file: File,
  folder: string
): Promise<{ path: string; fileName: string; mimeType: string } | null> {
  const toUpload = await compressImageForUpload(file);
  const supabase = createClient();
  const ext = toUpload.name.split(".").pop() || "bin";
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, toUpload, {
    contentType: toUpload.type || "application/octet-stream",
    upsert: false,
  });

  if (error) {
    console.error(error);
    return null;
  }

  return {
    path,
    fileName: toUpload.name,
    mimeType: toUpload.type || file.type,
  };
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
