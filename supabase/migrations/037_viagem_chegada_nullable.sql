-- Chegada real da viagem: informada no acompanhamento, não no cadastro inicial

ALTER TABLE public.viagens
  ALTER COLUMN chegada_prevista_em DROP NOT NULL;

COMMENT ON COLUMN public.viagens.chegada_prevista_em IS
  'Data/hora real de chegada — preenchida no acompanhamento da viagem';
