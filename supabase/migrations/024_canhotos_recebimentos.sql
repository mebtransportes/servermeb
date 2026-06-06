-- Canhotos de entrega e recebimentos de frete (viagens arquivadas)

CREATE TYPE public.recebimento_status AS ENUM ('pendente', 'pago', 'vencido');

CREATE TABLE IF NOT EXISTS public.viagem_canhotos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viagem_id UUID NOT NULL REFERENCES public.viagens(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_viagem_canhotos_viagem ON public.viagem_canhotos(viagem_id);

CREATE TABLE IF NOT EXISTS public.viagem_recebimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viagem_id UUID NOT NULL UNIQUE REFERENCES public.viagens(id) ON DELETE CASCADE,
  motorista_nome TEXT NOT NULL,
  veiculos_placas TEXT NOT NULL,
  empresa TEXT NOT NULL,
  valor_frete_total NUMERIC(14, 2) NOT NULL DEFAULT 0,
  valor_frete_liquido NUMERIC(14, 2) NOT NULL DEFAULT 0,
  valor_descargas_adicionais NUMERIC(14, 2) NOT NULL DEFAULT 0,
  data_recebimento DATE,
  status public.recebimento_status NOT NULL DEFAULT 'pendente',
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_viagem_recebimentos_status ON public.viagem_recebimentos(status);
CREATE INDEX IF NOT EXISTS idx_viagem_recebimentos_data ON public.viagem_recebimentos(data_recebimento);

DROP TRIGGER IF EXISTS tr_viagem_recebimentos_updated_at ON public.viagem_recebimentos;
CREATE TRIGGER tr_viagem_recebimentos_updated_at
  BEFORE UPDATE ON public.viagem_recebimentos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.viagem_canhotos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.viagem_recebimentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "viagem_canhotos_all" ON public.viagem_canhotos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "viagem_recebimentos_all" ON public.viagem_recebimentos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

COMMENT ON TABLE public.viagem_canhotos IS 'Comprovantes de entrega (canhotos) anexados no acompanhamento';
COMMENT ON TABLE public.viagem_recebimentos IS 'Recebimento do frete da empresa contratante — viagens ARQUIVADO';
COMMENT ON COLUMN public.viagem_recebimentos.valor_frete_liquido IS 'Frete bruto menos ICMS 12% (88% do total)';
