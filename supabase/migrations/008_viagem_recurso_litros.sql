-- Litros abastecidos em recursos de viagem

ALTER TABLE public.viagem_recursos
  ADD COLUMN IF NOT EXISTS litros NUMERIC(10, 2);
