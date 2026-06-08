-- Comissão / fechamento para motoristas terceiros (frete líquido com ICMS, seguro e monitoramento)

ALTER TABLE public.viagem_fechamentos
  ADD COLUMN IF NOT EXISTS motorista_terceiro BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS valor_carga NUMERIC(14, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_icms NUMERIC(14, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS seguro_valor NUMERIC(14, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS monitoramento_valor NUMERIC(14, 2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.viagem_fechamentos.motorista_terceiro IS
  'Motorista de terceiro: frete líquido = bruto − ICMS − seguro − monitoramento';
COMMENT ON COLUMN public.viagem_fechamentos.valor_carga IS
  'Valor da carga (valor_mercadoria da viagem) — base do seguro 0,09%';
COMMENT ON COLUMN public.viagem_fechamentos.seguro_valor IS
  'Seguro da viagem (0,09% do valor da carga quando lançado)';
COMMENT ON COLUMN public.viagem_fechamentos.monitoramento_valor IS
  'Monitoramento da viagem (valor fixo R$ 160 quando lançado)';
