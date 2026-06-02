-- Adiciona configuração por viagem no fechamento:
-- - icms_percent: imposto usado para calcular frete líquido (padrão 12%)
-- - comissao_tipo: percentual sobre frete líquido OU frete líquido total
-- - comissao_percent: percentual da comissão (padrão 12%)

ALTER TABLE public.viagem_fechamentos
  ADD COLUMN IF NOT EXISTS icms_percent NUMERIC(5, 2) NOT NULL DEFAULT 12,
  ADD COLUMN IF NOT EXISTS comissao_tipo TEXT NOT NULL DEFAULT 'PERCENTUAL',
  ADD COLUMN IF NOT EXISTS comissao_percent NUMERIC(5, 2) NOT NULL DEFAULT 12;

-- Recalcula frete_liquido e comissao_final para os registros existentes.
UPDATE public.viagem_fechamentos
SET
  frete_liquido = ROUND(valor_frete * (1 - (icms_percent / 100.0)), 2),
  comissao_final = ROUND(
    (
      CASE
        WHEN comissao_tipo = 'LIQUIDO_TOTAL' THEN (valor_frete * (1 - (icms_percent / 100.0)))
        ELSE (valor_frete * (1 - (icms_percent / 100.0))) * (comissao_percent / 100.0)
      END
    ) + reembolso_valor,
    2
  ),
  updated_at = now();

