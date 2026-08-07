"use server";

import { revalidatePath } from "next/cache";
import { requireAdminProfile } from "@/lib/auth-profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  gerarSaltHex,
  hashSenhaPbkdf2,
  verificarSenhaPbkdf2,
} from "@/lib/password-hash";

const BUCKET = "meb-docs-seguros";
const GERENCIAMENTO_PATH = "/configuracoes/gerenciamento";

export type AppSettingsRow = {
  dominio_expira_em: string | null;
  supabase_quota_db_bytes: number;
  supabase_quota_storage_bytes: number;
};

export type SupabaseUsage = {
  database_bytes: number;
  storage_bytes: number;
  top_tables: { name: string; bytes: number }[];
  buckets: { name: string; files: number; bytes: number }[];
};

export type DocumentoSeguroItem = {
  id: string;
  titulo: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number;
  created_at: string;
};

export type ActionResult = { ok: true } | { ok: false; message: string };

function revalidate() {
  revalidatePath(GERENCIAMENTO_PATH);
  revalidatePath("/", "layout");
}

export async function getAppSettings(): Promise<AppSettingsRow> {
  await requireAdminProfile();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("app_settings")
    .select(
      "dominio_expira_em, supabase_quota_db_bytes, supabase_quota_storage_bytes"
    )
    .eq("id", 1)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return {
    dominio_expira_em: data?.dominio_expira_em ?? null,
    supabase_quota_db_bytes: Number(data?.supabase_quota_db_bytes ?? 536870912),
    supabase_quota_storage_bytes: Number(
      data?.supabase_quota_storage_bytes ?? 1073741824
    ),
  };
}

/** Leitura leve para banner (admin). */
export async function getDominioExpiraEm(): Promise<string | null> {
  await requireAdminProfile();
  const supabase = await createClient();
  const { data } = await supabase
    .from("app_settings")
    .select("dominio_expira_em")
    .eq("id", 1)
    .maybeSingle();
  return data?.dominio_expira_em ?? null;
}

export async function salvarDominioExpiraEm(
  dataIso: string | null
): Promise<ActionResult> {
  try {
    await requireAdminProfile();
    const supabase = await createClient();
    const { error } = await supabase
      .from("app_settings")
      .upsert({
        id: 1,
        dominio_expira_em: dataIso || null,
        updated_at: new Date().toISOString(),
      });
    if (error) return { ok: false, message: error.message };
    revalidate();
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Erro ao salvar domínio.",
    };
  }
}

export async function salvarCotasSupabase(input: {
  quotaDbBytes: number;
  quotaStorageBytes: number;
}): Promise<ActionResult> {
  try {
    await requireAdminProfile();
    if (input.quotaDbBytes < 1 || input.quotaStorageBytes < 1) {
      return { ok: false, message: "Cotas inválidas." };
    }
    const supabase = await createClient();
    const { error } = await supabase.from("app_settings").upsert({
      id: 1,
      supabase_quota_db_bytes: input.quotaDbBytes,
      supabase_quota_storage_bytes: input.quotaStorageBytes,
      updated_at: new Date().toISOString(),
    });
    if (error) return { ok: false, message: error.message };
    revalidate();
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Erro ao salvar cotas.",
    };
  }
}

export async function getSupabaseUsage(): Promise<SupabaseUsage> {
  await requireAdminProfile();
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("admin_get_supabase_usage");
  if (error) throw new Error(error.message);

  const raw = (data ?? {}) as {
    database_bytes?: number;
    storage_bytes?: number;
    top_tables?: { name: string; bytes: number }[];
    buckets?: { name: string; files: number; bytes: number }[];
  };

  return {
    database_bytes: Number(raw.database_bytes ?? 0),
    storage_bytes: Number(raw.storage_bytes ?? 0),
    top_tables: (raw.top_tables ?? []).map((t) => ({
      name: t.name,
      bytes: Number(t.bytes ?? 0),
    })),
    buckets: (raw.buckets ?? []).map((b) => ({
      name: b.name,
      files: Number(b.files ?? 0),
      bytes: Number(b.bytes ?? 0),
    })),
  };
}

export async function listarDocumentosSeguros(): Promise<DocumentoSeguroItem[]> {
  await requireAdminProfile();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documentos_seguros")
    .select("id, titulo, file_name, mime_type, size_bytes, created_at")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []).map((d) => ({
    id: d.id,
    titulo: d.titulo,
    file_name: d.file_name,
    mime_type: d.mime_type,
    size_bytes: Number(d.size_bytes ?? 0),
    created_at: d.created_at,
  }));
}

export async function anexarDocumentoSeguro(formData: FormData): Promise<ActionResult> {
  try {
    const profile = await requireAdminProfile();
    const titulo = String(formData.get("titulo") ?? "").trim();
    const senha = String(formData.get("senha") ?? "");
    const confirmar = String(formData.get("confirmar") ?? "");
    const file = formData.get("arquivo");

    if (!titulo) return { ok: false, message: "Informe o título." };
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, message: "Selecione um arquivo PDF ou TXT." };
    }
    const mime = file.type || "application/octet-stream";
    const okMime =
      mime === "application/pdf" ||
      mime.startsWith("text/plain") ||
      file.name.toLowerCase().endsWith(".pdf") ||
      file.name.toLowerCase().endsWith(".txt");
    if (!okMime) return { ok: false, message: "Apenas PDF ou TXT." };
    if (file.size > 20 * 1024 * 1024) {
      return { ok: false, message: "Arquivo maior que 20 MB." };
    }
    if (senha.length < 4) {
      return { ok: false, message: "Senha com no mínimo 4 caracteres." };
    }
    if (senha !== confirmar) {
      return { ok: false, message: "As senhas não coincidem." };
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const ext = file.name.split(".").pop() || "bin";
    const path = `${crypto.randomUUID()}.${ext}`;
    const bytes = await file.arrayBuffer();

    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, bytes, {
        contentType: mime,
        upsert: false,
      });
    if (upErr) return { ok: false, message: upErr.message };

    const salt = gerarSaltHex();
    const hash = await hashSenhaPbkdf2(senha, salt);

    const { error: insErr } = await supabase.from("documentos_seguros").insert({
      titulo,
      storage_path: path,
      file_name: file.name,
      mime_type: mime,
      size_bytes: file.size,
      password_salt: salt,
      password_hash: hash,
      created_by: user?.id ?? null,
    });

    if (insErr) {
      await supabase.storage.from(BUCKET).remove([path]);
      return { ok: false, message: insErr.message };
    }

    void profile;
    revalidate();
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Erro ao anexar documento.",
    };
  }
}

async function carregarDocComSenha(id: string, senha: string) {
  await requireAdminProfile();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documentos_seguros")
    .select("id, storage_path, password_salt, password_hash, file_name, mime_type")
    .eq("id", id)
    .single();

  if (error || !data) throw new Error("Documento não encontrado.");

  const ok = await verificarSenhaPbkdf2(
    senha,
    data.password_salt,
    data.password_hash
  );
  if (!ok) throw new Error("Senha incorreta.");

  return data;
}

export async function obterUrlDocumentoSeguro(
  id: string,
  senha: string
): Promise<{ ok: true; url: string; fileName: string } | { ok: false; message: string }> {
  try {
    const doc = await carregarDocComSenha(id, senha);
    const supabase = await createClient();
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(doc.storage_path, 120);
    if (error || !data?.signedUrl) {
      return { ok: false, message: error?.message ?? "Falha ao gerar link." };
    }
    return { ok: true, url: data.signedUrl, fileName: doc.file_name };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Erro ao abrir documento.",
    };
  }
}

export async function excluirDocumentoSeguro(
  id: string,
  senha: string
): Promise<ActionResult> {
  try {
    const doc = await carregarDocComSenha(id, senha);
    const supabase = await createClient();
    await supabase.storage.from(BUCKET).remove([doc.storage_path]);
    const { error } = await supabase
      .from("documentos_seguros")
      .delete()
      .eq("id", id);
    if (error) return { ok: false, message: error.message };
    revalidate();
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Erro ao excluir documento.",
    };
  }
}
