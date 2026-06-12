-- Pedágio/estacionamento: controle se o valor reduz a comissão do motorista.
-- desconta_motorista = false → consta no financeiro, mas não entra no cálculo da comissão.

ALTER TABLE public.viagem_recursos
  ADD COLUMN IF NOT EXISTS desconta_motorista BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE public.viagem_fechamentos
  ADD COLUMN IF NOT EXISTS pedagio_desconta_motorista NUMERIC(14, 2) NOT NULL DEFAULT 0;
