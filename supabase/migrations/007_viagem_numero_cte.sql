-- Número do CTE (Conhecimento de Transporte Eletrônico)

ALTER TABLE public.viagens
  ADD COLUMN IF NOT EXISTS numero_cte TEXT;
