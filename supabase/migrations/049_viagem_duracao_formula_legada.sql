-- Viagens que já tinham chegada cadastrada mantêm duração saída→chegada.
-- Demais viagens usam contratação→chegada ao registrar a chegada.

ALTER TABLE public.viagens
  ADD COLUMN IF NOT EXISTS duracao_base_saida BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.viagens.duracao_base_saida IS
  'Quando true, a duração usa saída→chegada (viagens legadas com chegada já cadastrada).';

UPDATE public.viagens
SET duracao_base_saida = true
WHERE chegada_prevista_em IS NOT NULL;

ALTER TABLE public.viagem_fechamentos
  ADD COLUMN IF NOT EXISTS duracao_base_saida BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.viagem_fechamentos.duracao_base_saida IS
  'Cópia do flag de duração legada da viagem para relatórios de fechamento.';

UPDATE public.viagem_fechamentos vf
SET duracao_base_saida = true
FROM public.viagens v
WHERE vf.viagem_id = v.id
  AND v.duracao_base_saida = true;
