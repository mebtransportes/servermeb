-- Viagem agendada: motorista/veículo definidos, programação completa depois

ALTER TYPE public.viagem_status ADD VALUE IF NOT EXISTS 'AGENDADA';

ALTER TABLE public.viagens
  ALTER COLUMN saida_em DROP NOT NULL;

ALTER TABLE public.viagens
  ALTER COLUMN local_saida DROP NOT NULL;

COMMENT ON COLUMN public.viagens.saida_em IS
  'Data/hora de saída; opcional enquanto status = AGENDADA';

COMMENT ON COLUMN public.viagens.local_saida IS
  'Resumo das origens; opcional enquanto status = AGENDADA';
