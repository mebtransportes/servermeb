-- Despesa de descarga na viagem (mesmo controle de desconto da comissão que pedágio).

ALTER TYPE public.viagem_recurso_tipo ADD VALUE IF NOT EXISTS 'descarga';

ALTER TABLE public.viagem_fechamentos
  ADD COLUMN IF NOT EXISTS descarga_valor NUMERIC(14, 2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.viagem_fechamentos.descarga_valor IS
  'Total de despesas de descarga na viagem.';
