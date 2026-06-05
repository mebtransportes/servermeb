-- Abastecimento inicial no cadastro da viagem + consumo médio no fechamento

ALTER TABLE public.viagem_recursos
  ADD COLUMN IF NOT EXISTS abastecimento_inicial BOOLEAN NOT NULL DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_viagem_recurso_abastecimento_inicial
  ON public.viagem_recursos (viagem_id)
  WHERE abastecimento_inicial = TRUE;

ALTER TABLE public.viagem_fechamentos
  ADD COLUMN IF NOT EXISTS consumo_km_litro NUMERIC(10, 2);

COMMENT ON COLUMN public.viagem_recursos.abastecimento_inicial IS
  'Litros informados no cadastro da viagem (tanque cheio na saída).';

COMMENT ON COLUMN public.viagem_fechamentos.consumo_km_litro IS
  'Consumo médio da viagem: km_total / soma de litros de abastecimento.';
