-- Módulo Frota: Manutenções e Abastecimentos

CREATE TYPE public.frota_manutencao_status AS ENUM (
  'AGENDADO',
  'EM ANDAMENTO',
  'FINALIZADO'
);

CREATE TABLE IF NOT EXISTS public.frota_manutencoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  onde TEXT NOT NULL,
  oficina_id UUID REFERENCES public.oficinas(id),
  data_agendada DATE NOT NULL,
  hora_agendada TIME,
  valor_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  status public.frota_manutencao_status NOT NULL DEFAULT 'AGENDADO',
  origem TEXT NOT NULL DEFAULT 'preventiva' CHECK (origem IN ('preventiva', 'viagem')),
  viagem_recurso_id UUID UNIQUE REFERENCES public.viagem_recursos(id) ON DELETE SET NULL,
  veiculo_id UUID REFERENCES public.veiculos(id),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.frota_abastecimentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  veiculo_id UUID REFERENCES public.veiculos(id),
  posto_id UUID REFERENCES public.postos(id),
  km_abastecimento NUMERIC(10, 1),
  litros NUMERIC(10, 2),
  valor NUMERIC(12, 2) NOT NULL,
  descricao TEXT,
  data_hora TIMESTAMPTZ NOT NULL,
  origem TEXT NOT NULL DEFAULT 'manual' CHECK (origem IN ('manual', 'viagem')),
  viagem_recurso_id UUID UNIQUE REFERENCES public.viagem_recursos(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Status no kanban para manutenções vindas de viagens
ALTER TABLE public.viagem_recursos
  ADD COLUMN IF NOT EXISTS status_frota public.frota_manutencao_status DEFAULT 'FINALIZADO';

ALTER TABLE public.viagem_recursos
  ADD COLUMN IF NOT EXISTS km_abastecimento NUMERIC(10, 1);

DROP TRIGGER IF EXISTS tr_frota_manutencoes_updated_at ON public.frota_manutencoes;
CREATE TRIGGER tr_frota_manutencoes_updated_at
  BEFORE UPDATE ON public.frota_manutencoes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.frota_manutencoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.frota_abastecimentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "frota_manutencoes_all" ON public.frota_manutencoes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "frota_abastecimentos_all" ON public.frota_abastecimentos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_frota_manutencoes_status ON public.frota_manutencoes(status);
CREATE INDEX IF NOT EXISTS idx_frota_manutencoes_data ON public.frota_manutencoes(data_agendada);
CREATE INDEX IF NOT EXISTS idx_frota_abastecimentos_data ON public.frota_abastecimentos(data_hora);
