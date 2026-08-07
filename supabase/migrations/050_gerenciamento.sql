-- Gerenciamento: settings, docs seguros e métricas Supabase

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND lower(trim(coalesce(p.role, ''))) = 'admin'
  );
$$;

CREATE TABLE IF NOT EXISTS public.app_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  dominio_expira_em date,
  supabase_quota_db_bytes bigint NOT NULL DEFAULT 536870912,
  supabase_quota_storage_bytes bigint NOT NULL DEFAULT 1073741824,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.app_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_settings_admin_all" ON public.app_settings;
CREATE POLICY "app_settings_admin_all"
  ON public.app_settings
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE TABLE IF NOT EXISTS public.documentos_seguros (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  storage_path text NOT NULL,
  file_name text NOT NULL,
  mime_type text,
  size_bytes bigint NOT NULL DEFAULT 0,
  password_salt text NOT NULL,
  password_hash text NOT NULL,
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.documentos_seguros ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "documentos_seguros_admin_all" ON public.documentos_seguros;
CREATE POLICY "documentos_seguros_admin_all"
  ON public.documentos_seguros
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'meb-docs-seguros',
  'meb-docs-seguros',
  false,
  20971520,
  ARRAY['application/pdf', 'text/plain', 'text/plain; charset=utf-8']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "meb_docs_seguros_select" ON storage.objects;
DROP POLICY IF EXISTS "meb_docs_seguros_insert" ON storage.objects;
DROP POLICY IF EXISTS "meb_docs_seguros_update" ON storage.objects;
DROP POLICY IF EXISTS "meb_docs_seguros_delete" ON storage.objects;

CREATE POLICY "meb_docs_seguros_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'meb-docs-seguros' AND public.is_admin());

CREATE POLICY "meb_docs_seguros_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'meb-docs-seguros' AND public.is_admin());

CREATE POLICY "meb_docs_seguros_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'meb-docs-seguros' AND public.is_admin())
  WITH CHECK (bucket_id = 'meb-docs-seguros' AND public.is_admin());

CREATE POLICY "meb_docs_seguros_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'meb-docs-seguros' AND public.is_admin());

-- Métricas (somente service_role via Server Action)
CREATE OR REPLACE FUNCTION public.admin_get_supabase_usage()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, storage, pg_catalog
AS $$
DECLARE
  db_bytes bigint;
  storage_bytes bigint;
  top_tables jsonb;
  buckets jsonb;
BEGIN
  SELECT pg_database_size(current_database()) INTO db_bytes;

  SELECT coalesce(sum((metadata->>'size')::bigint), 0)
  INTO storage_bytes
  FROM storage.objects;

  SELECT coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
  INTO top_tables
  FROM (
    SELECT
      n.nspname || '.' || c.relname AS name,
      pg_total_relation_size(c.oid) AS bytes
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'r'
      AND n.nspname = 'public'
    ORDER BY pg_total_relation_size(c.oid) DESC
    LIMIT 8
  ) t;

  SELECT coalesce(jsonb_agg(row_to_json(b)::jsonb), '[]'::jsonb)
  INTO buckets
  FROM (
    SELECT
      o.bucket_id AS name,
      count(*)::int AS files,
      coalesce(sum((o.metadata->>'size')::bigint), 0) AS bytes
    FROM storage.objects o
    GROUP BY o.bucket_id
    ORDER BY coalesce(sum((o.metadata->>'size')::bigint), 0) DESC
  ) b;

  RETURN jsonb_build_object(
    'database_bytes', db_bytes,
    'storage_bytes', storage_bytes,
    'top_tables', top_tables,
    'buckets', buckets
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_get_supabase_usage() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_supabase_usage() TO service_role;
