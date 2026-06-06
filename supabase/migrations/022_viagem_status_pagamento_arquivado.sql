-- Novos status: pagamento pendente (fechamento) e arquivado (pago / fora do fechamento)

ALTER TYPE public.viagem_status ADD VALUE IF NOT EXISTS 'PAGAMENTO PENDENTE';
ALTER TYPE public.viagem_status ADD VALUE IF NOT EXISTS 'ARQUIVADO';
