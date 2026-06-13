-- Encargos individuais no recebimento (diária/descarga com CTE, data e status)

CREATE TYPE public.recebimento_encargo_tipo AS ENUM ('diaria', 'descarga');

CREATE TYPE public.recebimento_encargo_status AS ENUM ('sem_data', 'pendente', 'pago');

CREATE TABLE IF NOT EXISTS public.viagem_recebimento_encargos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recebimento_id UUID NOT NULL REFERENCES public.viagem_recebimentos(id) ON DELETE CASCADE,
  tipo public.recebimento_encargo_tipo NOT NULL,
  valor NUMERIC(14, 2) NOT NULL CHECK (valor > 0),
  numero_cte TEXT,
  data_recebimento DATE,
  status public.recebimento_encargo_status NOT NULL DEFAULT 'sem_data',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recebimento_encargos_recebimento
  ON public.viagem_recebimento_encargos(recebimento_id);
CREATE INDEX IF NOT EXISTS idx_recebimento_encargos_status
  ON public.viagem_recebimento_encargos(status);
CREATE INDEX IF NOT EXISTS idx_recebimento_encargos_tipo
  ON public.viagem_recebimento_encargos(tipo);
CREATE INDEX IF NOT EXISTS idx_recebimento_encargos_data
  ON public.viagem_recebimento_encargos(data_recebimento);

DROP TRIGGER IF EXISTS tr_viagem_recebimento_encargos_updated_at ON public.viagem_recebimento_encargos;
CREATE TRIGGER tr_viagem_recebimento_encargos_updated_at
  BEFORE UPDATE ON public.viagem_recebimento_encargos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.viagem_recebimento_encargos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "viagem_recebimento_encargos_all" ON public.viagem_recebimento_encargos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

COMMENT ON TABLE public.viagem_recebimento_encargos IS
  'Encargos lançados no recebimento (diária/descarga) com CTE, data prevista e status';
