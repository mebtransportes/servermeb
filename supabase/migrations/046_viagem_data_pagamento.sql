-- Data prevista de pagamento do frete (informada no acompanhamento; usada em Recebimentos).

ALTER TABLE public.viagens
  ADD COLUMN IF NOT EXISTS data_pagamento DATE;

COMMENT ON COLUMN public.viagens.data_pagamento IS
  'Data prevista para receber o frete da viagem. Copiada para viagem_recebimentos ao arquivar.';
