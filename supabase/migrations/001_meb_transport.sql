-- MEB - Sistema de Gestão de Transporte
-- Execute no SQL Editor do projeto: https://aearkstgzdhnzaubneem.supabase.co

-- Perfis vinculados ao Auth (login por nome de usuário)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  auth_email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Veículos
CREATE TABLE IF NOT EXISTS public.veiculos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  placa TEXT NOT NULL,
  chassi TEXT,
  ano_modelo TEXT,
  renavam TEXT,
  crlv_vencimento DATE,
  ipva_vencimento DATE,
  quitado BOOLEAN NOT NULL DEFAULT true,
  financiado BOOLEAN NOT NULL DEFAULT false,
  parcelas_restantes INTEGER,
  dia_vencimento_parcela INTEGER CHECK (dia_vencimento_parcela IS NULL OR (dia_vencimento_parcela >= 1 AND dia_vencimento_parcela <= 31)),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.veiculo_campos_custom (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  veiculo_id UUID NOT NULL REFERENCES public.veiculos(id) ON DELETE CASCADE,
  nome_opcao TEXT NOT NULL,
  valor TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.veiculo_anexos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  veiculo_id UUID NOT NULL REFERENCES public.veiculos(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Motoristas
CREATE TABLE IF NOT EXISTS public.motoristas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_completo TEXT NOT NULL,
  cpf TEXT NOT NULL,
  data_nascimento DATE NOT NULL,
  cnh_numero TEXT,
  cnh_categoria TEXT,
  cnh_expedicao DATE,
  cnh_vencimento DATE,
  telefone TEXT,
  contato_emergencia TEXT,
  toxicologico_data DATE,
  toxicologico_vencimento DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.motorista_anexos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  motorista_id UUID NOT NULL REFERENCES public.motoristas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Postos e Oficinas (estrutura compartilhada)
CREATE TABLE IF NOT EXISTS public.postos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_pessoa TEXT NOT NULL DEFAULT 'PJ' CHECK (tipo_pessoa IN ('PF', 'PJ')),
  nome TEXT NOT NULL,
  documento TEXT,
  cep TEXT,
  cidade TEXT,
  estado TEXT,
  logradouro TEXT,
  numero TEXT,
  bairro TEXT,
  local_proximo TEXT,
  complemento TEXT,
  telefone TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  maps_link TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.oficinas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_pessoa TEXT NOT NULL DEFAULT 'PJ' CHECK (tipo_pessoa IN ('PF', 'PJ')),
  nome TEXT NOT NULL,
  documento TEXT,
  cep TEXT,
  cidade TEXT,
  estado TEXT,
  logradouro TEXT,
  numero TEXT,
  bairro TEXT,
  local_proximo TEXT,
  complemento TEXT,
  telefone TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  maps_link TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Clientes e Fornecedores
CREATE TABLE IF NOT EXISTS public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_pessoa TEXT NOT NULL DEFAULT 'PJ' CHECK (tipo_pessoa IN ('PF', 'PJ')),
  documento TEXT NOT NULL,
  nome TEXT NOT NULL,
  telefone TEXT,
  cep TEXT,
  cidade TEXT,
  estado TEXT,
  logradouro TEXT,
  numero TEXT,
  bairro TEXT,
  local_proximo TEXT,
  complemento TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  maps_link TEXT,
  observacoes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fornecedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_pessoa TEXT NOT NULL DEFAULT 'PJ' CHECK (tipo_pessoa IN ('PF', 'PJ')),
  documento TEXT NOT NULL,
  nome TEXT NOT NULL,
  telefone TEXT,
  cep TEXT,
  cidade TEXT,
  estado TEXT,
  logradouro TEXT,
  numero TEXT,
  bairro TEXT,
  local_proximo TEXT,
  complemento TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  maps_link TEXT,
  observacoes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['profiles', 'veiculos', 'motoristas', 'postos', 'oficinas', 'clientes', 'fornecedores']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS tr_%s_updated_at ON public.%s', t, t);
    EXECUTE format(
      'CREATE TRIGGER tr_%s_updated_at BEFORE UPDATE ON public.%s FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()',
      t, t
    );
  END LOOP;
END $$;

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.veiculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.veiculo_campos_custom ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.veiculo_anexos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.motoristas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.motorista_anexos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.postos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oficinas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;

-- Políticas: usuários autenticados do sistema
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "veiculos_all" ON public.veiculos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "veiculo_campos_all" ON public.veiculo_campos_custom FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "veiculo_anexos_all" ON public.veiculo_anexos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "motoristas_all" ON public.motoristas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "motorista_anexos_all" ON public.motorista_anexos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "postos_all" ON public.postos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "oficinas_all" ON public.oficinas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "clientes_all" ON public.clientes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "fornecedores_all" ON public.fornecedores FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Lookup de username no login (antes de autenticar)
CREATE POLICY "profiles_login_lookup" ON public.profiles FOR SELECT TO anon USING (true);

-- Storage bucket para PDFs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('meb-documentos', 'meb-documentos', false, 10485760, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "meb_docs_select" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'meb-documentos');
CREATE POLICY "meb_docs_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'meb-documentos');
CREATE POLICY "meb_docs_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'meb-documentos');

-- Após criar 3 usuários no Auth (senha 123), vincule os perfis:
-- Substitua os UUIDs pelos IDs reais de Authentication > Users
--
-- INSERT INTO public.profiles (id, username, auth_email) VALUES
--   ('UUID-USER-1', 'admin', 'admin@meb.local'),
--   ('UUID-USER-2', 'operador1', 'operador1@meb.local'),
--   ('UUID-USER-3', 'operador2', 'operador2@meb.local');
