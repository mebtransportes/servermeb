-- Tipo de veículo (caminhão, carreta, cavalo) e múltiplos veículos por viagem

CREATE TYPE public.veiculo_tipo AS ENUM ('caminhao', 'carreta', 'cavalo');

ALTER TABLE public.veiculos
  ADD COLUMN IF NOT EXISTS tipo public.veiculo_tipo NOT NULL DEFAULT 'caminhao';

CREATE TABLE IF NOT EXISTS public.viagem_veiculos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viagem_id UUID NOT NULL REFERENCES public.viagens(id) ON DELETE CASCADE,
  veiculo_id UUID NOT NULL REFERENCES public.veiculos(id) ON DELETE RESTRICT,
  ordem INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (viagem_id, veiculo_id)
);

INSERT INTO public.viagem_veiculos (viagem_id, veiculo_id, ordem)
SELECT id, veiculo_id, 1
FROM public.viagens
WHERE veiculo_id IS NOT NULL
ON CONFLICT (viagem_id, veiculo_id) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_viagem_veiculos_viagem ON public.viagem_veiculos(viagem_id);

ALTER TABLE public.viagem_veiculos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "viagem_veiculos_all" ON public.viagem_veiculos;
CREATE POLICY "viagem_veiculos_all" ON public.viagem_veiculos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
