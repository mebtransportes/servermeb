-- Tabelas para múltiplos anexos em frota (substituem os campos únicos nota_fiscal_* e comprovante_*)

CREATE TABLE IF NOT EXISTS public.frota_abastecimento_anexos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  abastecimento_id UUID NOT NULL REFERENCES public.frota_abastecimentos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('nota_fiscal', 'comprovante')),
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.frota_manutencao_anexos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manutencao_id UUID NOT NULL REFERENCES public.frota_manutencoes(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('nota_fiscal', 'comprovante')),
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.viagem_recurso_anexos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recurso_id UUID NOT NULL REFERENCES public.viagem_recursos(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('nota_fiscal', 'comprovante')),
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_frota_abastecimento_anexos_abastecimento ON public.frota_abastecimento_anexos(abastecimento_id);
CREATE INDEX IF NOT EXISTS idx_frota_manutencao_anexos_manutencao ON public.frota_manutencao_anexos(manutencao_id);
CREATE INDEX IF NOT EXISTS idx_viagem_recurso_anexos_recurso ON public.viagem_recurso_anexos(recurso_id);
CREATE INDEX IF NOT EXISTS idx_frota_abastecimento_anexos_tipo ON public.frota_abastecimento_anexos(tipo);
CREATE INDEX IF NOT EXISTS idx_frota_manutencao_anexos_tipo ON public.frota_manutencao_anexos(tipo);
CREATE INDEX IF NOT EXISTS idx_viagem_recurso_anexos_tipo ON public.viagem_recurso_anexos(tipo);

-- Migrar dados existentes dos campos únicos para as novas tabelas

-- frota_abastecimentos
INSERT INTO public.frota_abastecimento_anexos (abastecimento_id, tipo, storage_path, file_name)
SELECT id, 'nota_fiscal', nota_fiscal_path, nota_fiscal_nome
FROM public.frota_abastecimentos
WHERE nota_fiscal_path IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.frota_abastecimento_anexos a
    WHERE a.abastecimento_id = public.frota_abastecimentos.id AND a.tipo = 'nota_fiscal'
  );

INSERT INTO public.frota_abastecimento_anexos (abastecimento_id, tipo, storage_path, file_name)
SELECT id, 'comprovante', comprovante_path, comprovante_nome
FROM public.frota_abastecimentos
WHERE comprovante_path IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.frota_abastecimento_anexos a
    WHERE a.abastecimento_id = public.frota_abastecimentos.id AND a.tipo = 'comprovante'
  );

-- frota_manutencoes
INSERT INTO public.frota_manutencao_anexos (manutencao_id, tipo, storage_path, file_name)
SELECT id, 'nota_fiscal', nota_fiscal_path, nota_fiscal_nome
FROM public.frota_manutencoes
WHERE nota_fiscal_path IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.frota_manutencao_anexos a
    WHERE a.manutencao_id = public.frota_manutencoes.id AND a.tipo = 'nota_fiscal'
  );

INSERT INTO public.frota_manutencao_anexos (manutencao_id, tipo, storage_path, file_name)
SELECT id, 'comprovante', comprovante_path, comprovante_nome
FROM public.frota_manutencoes
WHERE comprovante_path IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.frota_manutencao_anexos a
    WHERE a.manutencao_id = public.frota_manutencoes.id AND a.tipo = 'comprovante'
  );

-- viagem_recursos
INSERT INTO public.viagem_recurso_anexos (recurso_id, tipo, storage_path, file_name)
SELECT id, 'nota_fiscal', nota_fiscal_path, nota_fiscal_nome
FROM public.viagem_recursos
WHERE nota_fiscal_path IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.viagem_recurso_anexos a
    WHERE a.recurso_id = public.viagem_recursos.id AND a.tipo = 'nota_fiscal'
  );

INSERT INTO public.viagem_recurso_anexos (recurso_id, tipo, storage_path, file_name)
SELECT id, 'comprovante', comprovante_path, comprovante_nome
FROM public.viagem_recursos
WHERE comprovante_path IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.viagem_recurso_anexos a
    WHERE a.recurso_id = public.viagem_recursos.id AND a.tipo = 'comprovante'
  );
