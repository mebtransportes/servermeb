-- Pagamento de manutenções preventivas: à vista ou parcelado

ALTER TABLE public.frota_manutencoes
  ADD COLUMN IF NOT EXISTS pagamento_modalidade TEXT
    CHECK (pagamento_modalidade IN ('A_VISTA', 'A_PRAZO')),
  ADD COLUMN IF NOT EXISTS pagamento_forma TEXT
    CHECK (pagamento_forma IN ('DINHEIRO', 'PIX', 'DEPOSITO', 'CHEQUE', 'CARTAO')),
  ADD COLUMN IF NOT EXISTS pagamento_vencimento DATE;

CREATE TABLE IF NOT EXISTS public.frota_manutencao_parcelas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manutencao_id UUID NOT NULL REFERENCES public.frota_manutencoes(id) ON DELETE CASCADE,
  numero INTEGER NOT NULL CHECK (numero > 0),
  valor NUMERIC(12, 2) NOT NULL DEFAULT 0,
  data_vencimento DATE NOT NULL,
  UNIQUE (manutencao_id, numero)
);

CREATE INDEX IF NOT EXISTS idx_frota_manutencao_parcelas_manutencao
  ON public.frota_manutencao_parcelas(manutencao_id);

ALTER TABLE public.frota_manutencao_parcelas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "frota_manutencao_parcelas_all"
  ON public.frota_manutencao_parcelas
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

COMMENT ON COLUMN public.frota_manutencoes.pagamento_modalidade IS 'A_VISTA ou A_PRAZO';
COMMENT ON COLUMN public.frota_manutencoes.pagamento_forma IS 'DINHEIRO, PIX, DEPOSITO, CHEQUE, CARTAO';
COMMENT ON COLUMN public.frota_manutencoes.pagamento_vencimento IS 'Data de pagamento quando à vista';
