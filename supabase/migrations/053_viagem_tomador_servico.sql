-- Tomador do serviço (opcional) informado no cadastro da viagem

ALTER TABLE public.viagens
  ADD COLUMN IF NOT EXISTS tomador_servico TEXT;

COMMENT ON COLUMN public.viagens.tomador_servico IS
  'Nome do tomador do serviço, quando a viagem possui tomador. Nulo quando não possui.';
