-- -------------------------------------------------------------------------
-- Elimina un usuario de identidad y auth (solo admin).
-- Incluye limpieza de ventas y movimientos asociados.
-- -------------------------------------------------------------------------
begin;

create or replace function public.delete_identity_user_account(p_auth_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth, identidad, operaciones, ventas
as $$
declare
  v_persona_id uuid;
begin
  if auth.uid() is null or not public.is_admin_user(auth.uid()) then
    raise exception 'No autorizado para eliminar usuarios.';
  end if;

  if p_auth_user_id is null then
    raise exception 'Debes indicar el usuario auth a eliminar.';
  end if;

  if p_auth_user_id = auth.uid() then
    raise exception 'No puedes eliminar tu propia cuenta desde el panel.';
  end if;

  if to_regclass('ventas.ventas') is not null then
    execute 'delete from ventas.ventas where usuario_id = $1' using p_auth_user_id;
  end if;

  if to_regclass('operaciones.movimientos_inventario') is not null then
    execute 'delete from operaciones.movimientos_inventario where usuarios_id = $1' using p_auth_user_id;
  end if;

  delete from identidad.usuarios
  where id = p_auth_user_id
  returning persona_id into v_persona_id;

  if v_persona_id is not null then
    delete from identidad.personas where id = v_persona_id;
  end if;

  delete from auth.identities where user_id = p_auth_user_id;
  delete from auth.users where id = p_auth_user_id;
end;
$$;

grant execute on function public.delete_identity_user_account(uuid) to authenticated;

commit;
