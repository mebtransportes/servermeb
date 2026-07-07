-- Tipo de combustível em abastecimentos manuais da frota.
-- Pré-requisito: projeto MEB com migrations 001–004 já aplicadas
-- (veiculos, postos, viagem_recursos, frota_abastecimentos).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'frota_abastecimentos'
  ) THEN
    RAISE EXCEPTION
      'Tabela public.frota_abastecimentos não existe neste banco. '
      'Abra o SQL Editor do mesmo projeto usado pelo app (NEXT_PUBLIC_SUPABASE_URL no .env.local) '
      'e aplique as migrations do MEB a partir de supabase/migrations/001_meb_transport.sql.';
  END IF;
END $$;

ALTER TABLE public.frota_abastecimentos
  ADD COLUMN IF NOT EXISTS combustivel_tipo TEXT;

COMMENT ON COLUMN public.frota_abastecimentos.combustivel_tipo IS
  'Tipo de combustível (mesma lista das viagens) — usado em filtros e custos operacionais';
