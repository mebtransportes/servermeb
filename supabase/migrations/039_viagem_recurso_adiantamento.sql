-- Adiantamento de salário ao motorista — descontado na comissão da viagem

ALTER TYPE public.viagem_recurso_tipo ADD VALUE IF NOT EXISTS 'adiantamento';

ALTER TABLE public.viagem_fechamentos
  ADD COLUMN IF NOT EXISTS adiantamento_valor NUMERIC(14, 2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.viagem_fechamentos.adiantamento_valor IS
  'Total de adiantamentos ao motorista nesta viagem — descontado da comissão final';
