-- Diárias adicionais no recebimento (somadas ao total a receber)

ALTER TABLE public.viagem_recebimentos
  ADD COLUMN IF NOT EXISTS valor_diarias NUMERIC(14, 2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.viagem_recebimentos.valor_descargas_adicionais IS
  'Total de encargos de descarga lançados no recebimento';
COMMENT ON COLUMN public.viagem_recebimentos.valor_diarias IS
  'Total de encargos de diária lançados no recebimento';
