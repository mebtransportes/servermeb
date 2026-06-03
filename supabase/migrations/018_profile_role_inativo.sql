-- Perfil INATIVO + admin principal

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'mecanico', 'inativo'));

COMMENT ON COLUMN public.profiles.role IS 'admin | mecanico | inativo (sem login)';

UPDATE public.profiles
SET role = 'admin'
WHERE lower(auth_email) = lower('gabrielcarrarapessoal@gmail.com');

-- Trigger: novos usuários pelo Auth
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
  IF v_role NOT IN ('admin', 'mecanico', 'inativo') THEN
    v_role := 'mecanico';
  END IF;

  INSERT INTO public.profiles (id, username, auth_email, role)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(TRIM(NEW.raw_user_meta_data->>'username'), ''), split_part(NEW.email, '@', 1)),
    NEW.email,
    v_role
  )
  ON CONFLICT (id) DO UPDATE SET
    auth_email = EXCLUDED.auth_email;

  RETURN NEW;
END;
$$;
