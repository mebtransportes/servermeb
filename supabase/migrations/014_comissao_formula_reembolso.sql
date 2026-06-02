-- Comissão: 12% sobre (frete líquido − despesas) + reembolso = comissão final
-- Despesas = abastecimento + arla + manutenção + pedágio (sem reembolso)

UPDATE public.viagem_fechamentos
SET
  frete_liquido = ROUND(valor_frete * 0.88, 2),
  comissao_final = ROUND(
    GREATEST(
      0,
      (valor_frete * 0.88)
        - (abastecimento_valor + arla_valor + manutencao_total + pedagio_valor)
    ) * 0.12
    + reembolso_valor,
    2
  ),
  updated_at = now();
