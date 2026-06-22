-- Outras despesas (tipo outro): não descontam comissão por padrão; controle no fechamento.

ALTER TABLE public.viagem_fechamentos
  ADD COLUMN IF NOT EXISTS outros_desconta_motorista NUMERIC(14, 2) NOT NULL DEFAULT 0;

UPDATE public.viagem_recursos
SET desconta_motorista = false
WHERE tipo = 'outro';

UPDATE public.viagem_fechamentos vf
SET outros_desconta_motorista = COALESCE((
  SELECT SUM(vr.valor::numeric)
  FROM public.viagem_recursos vr
  WHERE vr.viagem_id = vf.viagem_id
    AND vr.tipo = 'outro'
    AND vr.desconta_motorista IS TRUE
), 0);

COMMENT ON COLUMN public.viagem_fechamentos.outros_desconta_motorista IS
  'Soma das despesas tipo outro marcadas para descontar da comissão do motorista.';
