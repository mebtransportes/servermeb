-- Novos status de viagem, tipos de gasto e combustível no abastecimento

-- Novos valores de enum (commit obrigatório antes do UPDATE — ver migration 028)
ALTER TYPE public.viagem_status ADD VALUE IF NOT EXISTS 'EM MANUTENÇÃO';
ALTER TYPE public.viagem_status ADD VALUE IF NOT EXISTS 'DESCARGA EM ANDAMENTO';

ALTER TYPE public.viagem_recurso_tipo ADD VALUE IF NOT EXISTS 'estacionamento';
ALTER TYPE public.viagem_recurso_tipo ADD VALUE IF NOT EXISTS 'seguro';
ALTER TYPE public.viagem_recurso_tipo ADD VALUE IF NOT EXISTS 'monitoramento';

ALTER TABLE public.viagem_recursos
  ADD COLUMN IF NOT EXISTS combustivel_tipo TEXT;

UPDATE public.viagem_recursos
SET tipo = 'abastecimento', combustivel_tipo = 'Arla'
WHERE tipo = 'arla';

COMMENT ON COLUMN public.viagem_recursos.combustivel_tipo IS
  'Tipo de combustível quando tipo = abastecimento (Arla, Diesel S10, etc.)';
