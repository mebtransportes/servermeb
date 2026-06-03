-- Despesas empresariais (escritório, limpeza, contabilidade/sistemas)

CREATE TABLE IF NOT EXISTS public.custos_empresariais_despesas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  segmento TEXT NOT NULL CHECK (segmento IN ('escritorio', 'limpeza', 'contabilidade')),
  valor NUMERIC(14, 2) NOT NULL,
  quantidade NUMERIC(10, 2) NOT NULL DEFAULT 1,
  nome_item TEXT NOT NULL,
  onde_comprou TEXT NOT NULL,
  data_despesa DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_custos_emp_despesas_segmento ON public.custos_empresariais_despesas(segmento);
CREATE INDEX IF NOT EXISTS idx_custos_emp_despesas_data ON public.custos_empresariais_despesas(data_despesa);

DROP TRIGGER IF EXISTS tr_custos_emp_despesas_updated_at ON public.custos_empresariais_despesas;
CREATE TRIGGER tr_custos_emp_despesas_updated_at
  BEFORE UPDATE ON public.custos_empresariais_despesas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.custos_empresariais_despesas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "custos_empresariais_despesas_all" ON public.custos_empresariais_despesas
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
