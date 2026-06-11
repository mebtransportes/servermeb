-- Múltiplos fornecedores (origem) por viagem, como as entregas

CREATE TABLE IF NOT EXISTS public.viagem_fornecedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viagem_id UUID NOT NULL REFERENCES public.viagens(id) ON DELETE CASCADE,
  ordem INTEGER NOT NULL,
  local_fornecedor TEXT NOT NULL,
  UNIQUE (viagem_id, ordem)
);

CREATE INDEX IF NOT EXISTS idx_viagem_fornecedores_viagem
  ON public.viagem_fornecedores(viagem_id);

ALTER TABLE public.viagens
  ADD COLUMN IF NOT EXISTS fornecedor_atual_ordem INTEGER;

COMMENT ON COLUMN public.viagens.fornecedor_atual_ordem IS
  'Ordem do fornecedor (origem) em que o veículo está, quando há mais de um';

ALTER TABLE public.viagem_fornecedores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "viagem_fornecedores_all"
  ON public.viagem_fornecedores
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Migra local_saida legado para a nova tabela
INSERT INTO public.viagem_fornecedores (viagem_id, ordem, local_fornecedor)
SELECT v.id, 1, trim(v.local_saida)
FROM public.viagens v
WHERE trim(v.local_saida) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM public.viagem_fornecedores vf WHERE vf.viagem_id = v.id
  );
