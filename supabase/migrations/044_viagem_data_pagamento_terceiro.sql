-- Data de pagamento programada para viagens com motorista terceiro

ALTER TABLE public.viagens
  ADD COLUMN IF NOT EXISTS data_pagamento_terceiro DATE;

COMMENT ON COLUMN public.viagens.data_pagamento_terceiro IS
  'Data programada de pagamento ao transportador terceiro';

ALTER TABLE public.viagem_fechamentos
  ADD COLUMN IF NOT EXISTS data_pagamento DATE;

COMMENT ON COLUMN public.viagem_fechamentos.data_pagamento IS
  'Data programada de pagamento (cópia/editável no fechamento de terceiros)';
