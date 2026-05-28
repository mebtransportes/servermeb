-- Vincula usuários já criados no Auth à tabela profiles
INSERT INTO public.profiles (id, username, auth_email)
SELECT
  id,
  split_part(email, '@', 1) AS username,
  email AS auth_email
FROM auth.users
WHERE email IS NOT NULL
ON CONFLICT (id) DO UPDATE SET
  auth_email = EXCLUDED.auth_email,
  username = EXCLUDED.username;

-- Novos usuários no Auth ganham perfil automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, auth_email)
  VALUES (
    NEW.id,
    split_part(NEW.email, '@', 1),
    NEW.email
  )
  ON CONFLICT (id) DO UPDATE SET
    auth_email = EXCLUDED.auth_email;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
