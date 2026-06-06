-- Remove registros antigos de abastecimento inicial no cadastro da viagem.
-- Litros do tanque passam a vir somente de Frota → Abastecimentos.

CREATE TEMP TABLE _viagens_abastecimento_inicial_legacy ON COMMIT DROP AS
SELECT DISTINCT viagem_id
FROM public.viagem_recursos
WHERE abastecimento_inicial = TRUE;

DELETE FROM public.viagem_recursos
WHERE abastecimento_inicial = TRUE;

DROP INDEX IF EXISTS public.idx_viagem_recurso_abastecimento_inicial;

-- Recalcula litros no fechamento das viagens afetadas (sem tanque inicial legado)
UPDATE public.viagem_fechamentos f
SET
  litros_tanque_inicial = 0,
  litros_abastecimento_viagem = COALESCE((
    SELECT SUM(r.litros)::numeric
    FROM public.viagem_recursos r
    WHERE r.viagem_id = f.viagem_id
      AND r.tipo = 'abastecimento'
  ), 0),
  abastecimento_litros = COALESCE((
    SELECT SUM(r.litros)::numeric
    FROM public.viagem_recursos r
    WHERE r.viagem_id = f.viagem_id
      AND r.tipo = 'abastecimento'
  ), 0),
  consumo_km_litro = CASE
    WHEN f.km_total IS NOT NULL
      AND f.km_total > 0
      AND COALESCE((
        SELECT SUM(r.litros)::numeric
        FROM public.viagem_recursos r
        WHERE r.viagem_id = f.viagem_id AND r.tipo = 'abastecimento'
      ), 0) > 0
    THEN ROUND(
      (f.km_total / COALESCE((
        SELECT SUM(r.litros)::numeric
        FROM public.viagem_recursos r
        WHERE r.viagem_id = f.viagem_id AND r.tipo = 'abastecimento'
      ), 1))::numeric,
      2
    )
    ELSE NULL
  END
WHERE f.viagem_id IN (SELECT viagem_id FROM _viagens_abastecimento_inicial_legacy);

COMMENT ON COLUMN public.viagem_recursos.abastecimento_inicial IS
  'Legado — não usar. Litros do tanque vêm de Frota → Abastecimentos.';
