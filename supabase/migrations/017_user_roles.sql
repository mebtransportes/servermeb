-- Perfis de usuário: admin (acesso total) e mecanico (acesso restrito)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role TEXT;

UPDATE public.profiles SET role = 'admin' WHERE role IS NULL;

ALTER TABLE public.profiles
  ALTER COLUMN role SET NOT NULL,
  ALTER COLUMN role SET DEFAULT 'mecanico';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'mecanico'));

COMMENT ON COLUMN public.profiles.role IS 'admin = acesso total; mecanico = frota, postos/oficinas, custos operacionais';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
BEGIN
  v_role := COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'role'), ''), 'mecanico');
  IF v_role NOT IN ('admin', 'mecanico') THEN
    v_role := 'mecanico';
  END IF;

  INSERT INTO public.profiles (id, username, auth_email, role)
  VALUES (
    NEW.id,
    split_part(NEW.email, '@', 1),
    NEW.email,
    v_role
  )
  ON CONFLICT (id) DO UPDATE SET
    auth_email = EXCLUDED.auth_email;
  RETURN NEW;
END;
$$;

-- Criar mecânico: usuário no Auth + UPDATE profiles SET role = 'mecanico' WHERE username = '...';
-- Ou metadata no Auth: { "role": "mecanico" }
