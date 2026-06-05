-- Litros totais no tanque (Frota → Abastecimentos) e detalhe no fechamento

ALTER TABLE public.frota_abastecimentos
  ADD COLUMN IF NOT EXISTS litros_totais NUMERIC(10, 2);

ALTER TABLE public.viagem_fechamentos
  ADD COLUMN IF NOT EXISTS litros_tanque_inicial NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS litros_abastecimento_viagem NUMERIC(10, 2);

COMMENT ON COLUMN public.frota_abastecimentos.litros_totais IS
  'Litros totais no tanque após o abastecimento (usado no cadastro da viagem).';

COMMENT ON COLUMN public.viagem_fechamentos.litros_tanque_inicial IS
  'Litros no tanque na saída (último abastecimento manual em Frota antes da viagem).';

COMMENT ON COLUMN public.viagem_fechamentos.litros_abastecimento_viagem IS
  'Litros abastecidos durante a viagem (sem o tanque inicial).';
