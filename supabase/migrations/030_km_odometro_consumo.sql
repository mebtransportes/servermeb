-- Odômetro na viagem: KM inicial (último abastecimento) e KM final (acompanhamento)

ALTER TABLE public.viagens
  ADD COLUMN IF NOT EXISTS km_odometro_inicial NUMERIC(10, 1),
  ADD COLUMN IF NOT EXISTS km_odometro_final NUMERIC(10, 1);

ALTER TABLE public.viagem_fechamentos
  ADD COLUMN IF NOT EXISTS km_odometro_inicial NUMERIC(10, 1),
  ADD COLUMN IF NOT EXISTS km_odometro_final NUMERIC(10, 1),
  ADD COLUMN IF NOT EXISTS km_rodado NUMERIC(10, 1);

COMMENT ON COLUMN public.viagens.km_odometro_inicial IS
  'Odômetro na saída — último KM de abastecimento do veículo antes desta viagem';
COMMENT ON COLUMN public.viagens.km_odometro_final IS
  'Odômetro ao final da rota — informado no acompanhamento';
COMMENT ON COLUMN public.viagem_fechamentos.km_rodado IS
  'KM rodado na viagem: odômetro final − odômetro inicial';
