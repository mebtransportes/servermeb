-- Data prevista para a próxima manutenção do mesmo tipo (ex.: próxima troca de óleo)

ALTER TABLE public.frota_manutencoes
  ADD COLUMN IF NOT EXISTS data_proxima_manutencao DATE;

COMMENT ON COLUMN public.frota_manutencoes.data_proxima_manutencao IS
  'Data prevista para repetir esta manutenção no veículo; usada nos alertas de vencimento';
