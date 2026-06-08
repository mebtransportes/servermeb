-- Migra status legado após os novos valores de viagem_status estarem commitados (027)

UPDATE public.viagens
SET status = 'DESCARGA EM ANDAMENTO'
WHERE status = 'DESCARREGANDO';
