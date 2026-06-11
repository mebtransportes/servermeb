-- Vencimento do tacógrafo (controle igual CRLV e IPVA)

ALTER TABLE public.veiculos
  ADD COLUMN IF NOT EXISTS tacografo_vencimento DATE;

COMMENT ON COLUMN public.veiculos.tacografo_vencimento IS 'Data de vencimento da aferição/calibração do tacógrafo';
