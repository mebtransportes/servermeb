-- Campos extras no fechamento: chegada, pedágio/estacionamento separados, KM final abastecimento

ALTER TABLE public.viagem_fechamentos
  ADD COLUMN IF NOT EXISTS chegada_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS estacionamento_valor NUMERIC(14, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS km_final_abastecimento NUMERIC(10, 2);

COMMENT ON COLUMN public.viagem_fechamentos.chegada_em IS
  'Data/hora de chegada da viagem (copiada de viagens.chegada_prevista_em)';
COMMENT ON COLUMN public.viagem_fechamentos.estacionamento_valor IS
  'Total de estacionamentos na viagem (pedagio_valor passa a ser só pedágio)';
COMMENT ON COLUMN public.viagem_fechamentos.km_final_abastecimento IS
  'KM do hodômetro no último abastecimento da viagem';
