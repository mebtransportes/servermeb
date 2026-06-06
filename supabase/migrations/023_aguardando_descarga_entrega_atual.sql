-- Status aguardando descarga e entrega atual da viagem

ALTER TYPE public.viagem_status ADD VALUE IF NOT EXISTS 'AGUARDANDO DESCARGA';

ALTER TABLE public.viagens
  ADD COLUMN IF NOT EXISTS entrega_atual_ordem INTEGER;

COMMENT ON COLUMN public.viagens.entrega_atual_ordem IS
  'Ordem da entrega em andamento (1, 2, …) para exibição no acompanhamento.';
