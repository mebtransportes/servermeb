-- Novos tipos de recurso na viagem (execute antes do 010)

ALTER TYPE public.viagem_recurso_tipo ADD VALUE IF NOT EXISTS 'reembolso';
ALTER TYPE public.viagem_recurso_tipo ADD VALUE IF NOT EXISTS 'pedagio';
