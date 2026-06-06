-- Comprovantes de descarga anexados no acompanhamento da viagem

CREATE TABLE IF NOT EXISTS public.viagem_comprovantes_descarga (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viagem_id UUID NOT NULL REFERENCES public.viagens(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_viagem_comprovantes_descarga_viagem
  ON public.viagem_comprovantes_descarga(viagem_id);

ALTER TABLE public.viagem_comprovantes_descarga ENABLE ROW LEVEL SECURITY;

CREATE POLICY "viagem_comprovantes_descarga_all" ON public.viagem_comprovantes_descarga
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

COMMENT ON TABLE public.viagem_comprovantes_descarga IS 'Comprovantes de descarga anexados no acompanhamento';
