-- Frota própria vs terceiro (motoristas e veículos)

CREATE TYPE public.recurso_vinculo AS ENUM ('frota', 'terceiro');

ALTER TABLE public.veiculos
  ADD COLUMN IF NOT EXISTS vinculo public.recurso_vinculo NOT NULL DEFAULT 'frota';

ALTER TABLE public.motoristas
  ADD COLUMN IF NOT EXISTS vinculo public.recurso_vinculo NOT NULL DEFAULT 'frota';

ALTER TABLE public.motoristas
  ALTER COLUMN data_nascimento DROP NOT NULL;
