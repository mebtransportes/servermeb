-- KM do veículo e anexos (NF + comprovante) em manutenção e abastecimento

ALTER TABLE public.frota_manutencoes
  ADD COLUMN IF NOT EXISTS km_veiculo NUMERIC(10, 1),
  ADD COLUMN IF NOT EXISTS nota_fiscal_path TEXT,
  ADD COLUMN IF NOT EXISTS nota_fiscal_nome TEXT,
  ADD COLUMN IF NOT EXISTS comprovante_path TEXT,
  ADD COLUMN IF NOT EXISTS comprovante_nome TEXT;

ALTER TABLE public.frota_abastecimentos
  ADD COLUMN IF NOT EXISTS nota_fiscal_path TEXT,
  ADD COLUMN IF NOT EXISTS nota_fiscal_nome TEXT,
  ADD COLUMN IF NOT EXISTS comprovante_path TEXT,
  ADD COLUMN IF NOT EXISTS comprovante_nome TEXT;

-- KM em manutenções registradas na viagem (abastecimento já usa km_abastecimento)
ALTER TABLE public.viagem_recursos
  ADD COLUMN IF NOT EXISTS km_veiculo NUMERIC(10, 1);

ALTER TABLE public.viagem_recursos
  ADD COLUMN IF NOT EXISTS nota_fiscal_path TEXT,
  ADD COLUMN IF NOT EXISTS nota_fiscal_nome TEXT,
  ADD COLUMN IF NOT EXISTS comprovante_path TEXT,
  ADD COLUMN IF NOT EXISTS comprovante_nome TEXT;
