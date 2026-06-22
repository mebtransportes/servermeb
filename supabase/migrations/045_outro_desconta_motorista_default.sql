-- Despesas tipo outro não devem descontar comissão por padrão (DEFAULT da coluna era true).

ALTER TABLE public.viagem_recursos
  ALTER COLUMN desconta_motorista SET DEFAULT false;

UPDATE public.viagem_recursos
SET desconta_motorista = false
WHERE tipo = 'outro' AND desconta_motorista IS TRUE;

UPDATE public.viagem_fechamentos vf
SET outros_desconta_motorista = COALESCE((
  SELECT SUM(vr.valor::numeric)
  FROM public.viagem_recursos vr
  WHERE vr.viagem_id = vf.viagem_id
    AND vr.tipo = 'outro'
    AND vr.desconta_motorista IS TRUE
), 0)
WHERE EXISTS (
  SELECT 1 FROM public.viagem_recursos vr
  WHERE vr.viagem_id = vf.viagem_id AND vr.tipo = 'outro'
);
