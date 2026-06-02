-- Fechamento financeiro por viagem finalizada

CREATE TABLE IF NOT EXISTS public.viagem_fechamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viagem_id UUID NOT NULL UNIQUE REFERENCES public.viagens(id) ON DELETE CASCADE,
  motorista_id UUID NOT NULL REFERENCES public.motoristas(id) ON DELETE CASCADE,
  motorista_nome TEXT NOT NULL,
  data_embarque TIMESTAMPTZ NOT NULL,
  local_embarque TEXT NOT NULL,
  veiculo_label TEXT NOT NULL,
  numero_cte TEXT,
  destino TEXT,
  km_total NUMERIC(10, 2),
  abastecimento_litros NUMERIC(10, 2) NOT NULL DEFAULT 0,
  abastecimento_valor NUMERIC(14, 2) NOT NULL DEFAULT 0,
  arla_valor NUMERIC(14, 2) NOT NULL DEFAULT 0,
  manutencao_total NUMERIC(14, 2) NOT NULL DEFAULT 0,
  pedagio_valor NUMERIC(14, 2) NOT NULL DEFAULT 0,
  reembolso_valor NUMERIC(14, 2) NOT NULL DEFAULT 0,
  valor_frete NUMERIC(14, 2) NOT NULL DEFAULT 0,
  frete_liquido NUMERIC(14, 2) NOT NULL DEFAULT 0,
  comissao_final NUMERIC(14, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_viagem_fechamentos_motorista ON public.viagem_fechamentos(motorista_id);
CREATE INDEX IF NOT EXISTS idx_viagem_fechamentos_data ON public.viagem_fechamentos(data_embarque);

DROP TRIGGER IF EXISTS tr_viagem_fechamentos_updated_at ON public.viagem_fechamentos;
CREATE TRIGGER tr_viagem_fechamentos_updated_at
  BEFORE UPDATE ON public.viagem_fechamentos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.viagem_fechamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "viagem_fechamentos_all" ON public.viagem_fechamentos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
