-- Data de contratação da viagem (início do prazo até a chegada)

ALTER TABLE public.viagens
  ADD COLUMN IF NOT EXISTS data_contratacao TIMESTAMPTZ;

COMMENT ON COLUMN public.viagens.data_contratacao IS
  'Data e hora em que a viagem foi contratada; usada no cálculo de duração até a chegada.';

ALTER TABLE public.viagem_fechamentos
  ADD COLUMN IF NOT EXISTS data_contratacao TIMESTAMPTZ;

COMMENT ON COLUMN public.viagem_fechamentos.data_contratacao IS
  'Cópia da data de contratação da viagem para relatórios de fechamento.';
