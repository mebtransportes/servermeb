-- Despesa "outro" com vínculo opcional ao reembolso (motorista pagou do bolso)

ALTER TYPE public.viagem_recurso_tipo ADD VALUE IF NOT EXISTS 'outro';

ALTER TABLE public.viagem_recursos
  ADD COLUMN IF NOT EXISTS recurso_par_id UUID REFERENCES public.viagem_recursos(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_viagem_recursos_par_id
  ON public.viagem_recursos(recurso_par_id);

ALTER TABLE public.viagem_fechamentos
  ADD COLUMN IF NOT EXISTS outros_valor NUMERIC(14, 2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.viagem_recursos.recurso_par_id IS
  'Reembolso vinculado à despesa original (ex.: outro → reembolso do motorista)';

COMMENT ON COLUMN public.viagem_fechamentos.outros_valor IS
  'Despesas diversas (tipo outro) lançadas na viagem';
