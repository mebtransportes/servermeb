-- Valor do frete a ser pago na viagem

ALTER TABLE public.viagens
  ADD COLUMN IF NOT EXISTS valor_frete NUMERIC(14, 2);
