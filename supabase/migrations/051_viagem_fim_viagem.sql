-- Data/hora de fim da viagem (além de contratação, saída e chegada)

ALTER TABLE public.viagens
  ADD COLUMN IF NOT EXISTS fim_viagem_em TIMESTAMPTZ;

COMMENT ON COLUMN public.viagens.fim_viagem_em IS
  'Data e hora de fim da viagem — informada no cadastro ou edição da viagem.';

ALTER TABLE public.viagem_fechamentos
  ADD COLUMN IF NOT EXISTS fim_viagem_em TIMESTAMPTZ;

COMMENT ON COLUMN public.viagem_fechamentos.fim_viagem_em IS
  'Cópia da data de fim da viagem para relatórios de fechamento.';
