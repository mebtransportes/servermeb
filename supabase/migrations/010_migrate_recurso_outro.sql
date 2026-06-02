-- Converte registros antigos "outro" para reembolso (rode após o 009)

UPDATE public.viagem_recursos
SET tipo = 'reembolso'
WHERE tipo = 'outro';
