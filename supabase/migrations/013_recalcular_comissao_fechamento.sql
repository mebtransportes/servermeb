-- Recalcula comissão: frete líquido = frete − 12%; comissão = líquido − 12%

UPDATE public.viagem_fechamentos
SET
  frete_liquido = ROUND(valor_frete * 0.88, 2),
  comissao_final = ROUND(valor_frete * 0.88 * 0.88, 2),
  updated_at = now()
WHERE valor_frete IS NOT NULL;
