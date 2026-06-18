-- Desconto obtido em abastecimentos de viagem (controle financeiro).

ALTER TABLE public.viagem_recursos
  ADD COLUMN IF NOT EXISTS teve_desconto_combustivel BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS valor_desconto_combustivel NUMERIC(14, 2);

ALTER TABLE public.viagem_fechamentos
  ADD COLUMN IF NOT EXISTS abastecimento_desconto_total NUMERIC(14, 2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.viagem_recursos.teve_desconto_combustivel IS
  'Indica se houve desconto no abastecimento.';
COMMENT ON COLUMN public.viagem_recursos.valor_desconto_combustivel IS
  'Valor do desconto obtido no abastecimento (controle).';
COMMENT ON COLUMN public.viagem_fechamentos.abastecimento_desconto_total IS
  'Soma dos descontos de abastecimento da viagem.';
