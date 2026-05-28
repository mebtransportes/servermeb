-- Módulo Operacional: Viagens

CREATE TYPE public.viagem_status AS ENUM (
  'EM ANDAMENTO',
  'EM CARREGAMENTO',
  'EM ROTA',
  'CHEGOU AO DESTINO DE ENTREGA',
  'CHEGOU AO DESTINO FINAL',
  'DESCARREGANDO',
  'PARADO NA ESTRADA',
  'EM ATRASO',
  'FINALIZADO'
);

CREATE TYPE public.viagem_tipo_trajeto AS ENUM ('ida', 'volta', 'ida_volta');

CREATE TYPE public.viagem_anexo_categoria AS ENUM (
  'CTE', 'CIOT', 'MDFE', 'ROMANEIO', 'ENTREGAS', 'NOTAS_FISCAIS',
  'CNH', 'TOXICOLOGICO', 'CRLV', 'COMPROVANTE'
);

CREATE TYPE public.viagem_recurso_tipo AS ENUM ('abastecimento', 'manutencao', 'outro');

CREATE TABLE IF NOT EXISTS public.viagens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  motorista_id UUID NOT NULL REFERENCES public.motoristas(id),
  veiculo_id UUID NOT NULL REFERENCES public.veiculos(id),
  saida_em TIMESTAMPTZ NOT NULL,
  chegada_prevista_em TIMESTAMPTZ NOT NULL,
  local_saida TEXT NOT NULL,
  tipo_trajeto public.viagem_tipo_trajeto NOT NULL DEFAULT 'ida',
  peso_kg NUMERIC(12, 2),
  valor_mercadoria NUMERIC(14, 2),
  descricao_mercadoria TEXT,
  km_total NUMERIC(10, 2),
  status public.viagem_status NOT NULL DEFAULT 'EM ANDAMENTO',
  motorista_apto BOOLEAN NOT NULL DEFAULT false,
  veiculo_apto BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.viagem_entregas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viagem_id UUID NOT NULL REFERENCES public.viagens(id) ON DELETE CASCADE,
  ordem INTEGER NOT NULL DEFAULT 1,
  local_entrega TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.viagem_anexos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viagem_id UUID NOT NULL REFERENCES public.viagens(id) ON DELETE CASCADE,
  recurso_id UUID,
  categoria public.viagem_anexo_categoria NOT NULL,
  nome TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  origem TEXT NOT NULL DEFAULT 'upload',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.viagem_recursos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  viagem_id UUID NOT NULL REFERENCES public.viagens(id) ON DELETE CASCADE,
  tipo public.viagem_recurso_tipo NOT NULL,
  valor NUMERIC(12, 2) NOT NULL,
  descricao TEXT,
  posto_id UUID REFERENCES public.postos(id),
  oficina_id UUID REFERENCES public.oficinas(id),
  realizado_em TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.viagem_anexos
  ADD CONSTRAINT viagem_anexos_recurso_fk
  FOREIGN KEY (recurso_id) REFERENCES public.viagem_recursos(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_viagens_status ON public.viagens(status);
CREATE INDEX IF NOT EXISTS idx_viagens_motorista ON public.viagens(motorista_id);
CREATE INDEX IF NOT EXISTS idx_viagem_entregas_viagem ON public.viagem_entregas(viagem_id);

DROP TRIGGER IF EXISTS tr_viagens_updated_at ON public.viagens;
CREATE TRIGGER tr_viagens_updated_at
  BEFORE UPDATE ON public.viagens
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.viagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.viagem_entregas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.viagem_anexos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.viagem_recursos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "viagens_all" ON public.viagens FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "viagem_entregas_all" ON public.viagem_entregas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "viagem_anexos_all" ON public.viagem_anexos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "viagem_recursos_all" ON public.viagem_recursos FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Permitir imagens e PDFs no bucket
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif'
]
WHERE id = 'meb-documentos';
