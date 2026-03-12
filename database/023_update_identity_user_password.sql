-- -------------------------------------------------------------------------
-- Actualiza la contrasena de un usuario (solo admin).
-- No modifica rol ni datos de identidad.
-- -------------------------------------------------------------------------
begin;

create extension if not exists pgcrypto with schema extensions;

create or replace function public.update_identity_user_password(
  p_auth_user_id uuid,
  p_password text
)
returns void
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
begin
  if auth.uid() is null or not public.is_admin_user(auth.uid()) then
    raise exception 'No autorizado para cambiar contrasenas.';
  end if;

  if p_auth_user_id is null then
    raise exception 'Debes indicar el usuario auth.';
  end if;

  if length(coalesce(p_password, '')) < 12
    or p_password !~ '[A-Z]'
    or p_password !~ '[a-z]'
    or p_password !~ '[0-9]'
    or p_password !~ '[^A-Za-z0-9]' then
    raise exception 'La contrasena no cumple politica de seguridad.';
  end if;

  update auth.users
  set
    encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')),
    email_confirmed_at = coalesce(email_confirmed_at, now()),
    updated_at = now()
  where id = p_auth_user_id;

  if not found then
    raise exception 'No existe el usuario en auth.users.';
  end if;
end;
$$;

grant execute on function public.update_identity_user_password(uuid, text) to authenticated;

commit;
