-- -------------------------------------------------------------------------
-- Auditoria y enlace automatico de sesion:
-- 1) Enlaza auth.uid() con identidad.usuarios por email si faltaba la relacion.
-- 2) Actualiza ultimo_acceso y estado al iniciar sesion.
-- 3) Expone diagnostico de sesion y rol para permisos de frontend.
-- -------------------------------------------------------------------------
begin;

create or replace function public.sync_identity_session_link()
returns table (
  auth_user_id uuid,
  email text,
  persona_id uuid,
  rol_id smallint,
  rol_nombre text,
  linked boolean,
  diagnostic text
)
language plpgsql
security definer
set search_path = public, auth, identidad
as $$
declare
  v_uid uuid;
  v_email text;
  v_persona_id uuid;
  v_role_id smallint;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'No hay sesion autenticada.';
  end if;

  select au.email
  into v_email
  from auth.users au
  where au.id = v_uid
  limit 1;

  if v_email is null then
    raise exception 'No se encontro el usuario en auth.users.';
  end if;

  update identidad.usuarios u
  set
    ultimo_acceso = now(),
    estado = true,
    updated_at = now()
  where u.id = v_uid
  returning u.persona_id, u.rol_id into v_persona_id, v_role_id;

  if not found then
    select p.id
    into v_persona_id
    from identidad.personas p
    where lower(coalesce(p.email::text, '')) = lower(v_email)
    order by p.updated_at desc nulls last, p.created_at desc nulls last
    limit 1;

    if v_persona_id is not null then
      select u.rol_id
      into v_role_id
      from identidad.usuarios u
      where u.persona_id = v_persona_id
        and u.rol_id is not null
      order by u.fecha_asignacion desc nulls last, u.updated_at desc nulls last
      limit 1;

      insert into identidad.usuarios (
        id,
        persona_id,
        rol_id,
        fecha_asignacion,
        ultimo_acceso,
        estado,
        created_at,
        updated_at
      )
      values (
        v_uid,
        v_persona_id,
        v_role_id,
        now(),
        now(),
        true,
        now(),
        now()
      )
      on conflict (id) do update
        set persona_id = excluded.persona_id,
            rol_id = coalesce(identidad.usuarios.rol_id, excluded.rol_id),
            estado = true,
            ultimo_acceso = now(),
            updated_at = now();
    end if;
  end if;

  return query
  select
    au.id::uuid as auth_user_id,
    au.email::text,
    p.id::uuid as persona_id,
    u.rol_id::smallint,
    r.nombre::text as rol_nombre,
    (u.id is not null and p.id is not null)::boolean as linked,
    case
      when u.id is null then 'No existe usuario en identidad enlazado a esta sesion.'
      when p.id is null then 'El usuario de identidad no tiene persona vinculada.'
      when u.rol_id is null then 'El usuario esta enlazado pero no tiene rol asignado.'
      else 'Sesion enlazada correctamente.'
    end::text as diagnostic
  from auth.users au
  left join identidad.usuarios u on u.id = au.id
  left join identidad.personas p on p.id = u.persona_id
  left join identidad.roles r on r.id = u.rol_id
  where au.id = v_uid;
end;
$$;

create or replace function public.get_identity_context()
returns table (
  auth_user_id uuid,
  email text,
  persona_id uuid,
  nombres text,
  apellidos text,
  rol_id smallint,
  rol_nombre text,
  estado boolean
)
language plpgsql
security definer
set search_path = public, auth, identidad
as $$
begin
  perform public.sync_identity_session_link();

  return query
  select
    au.id::uuid as auth_user_id,
    au.email::text,
    p.id::uuid as persona_id,
    coalesce(p.nombres, '')::text as nombres,
    coalesce(p.apellidos, '')::text as apellidos,
    u.rol_id::smallint,
    r.nombre::text as rol_nombre,
    coalesce(u.estado, p.estado, true)::boolean as estado
  from auth.users au
  left join identidad.usuarios u on u.id = au.id
  left join identidad.personas p on p.id = u.persona_id
  left join identidad.roles r on r.id = u.rol_id
  where au.id = auth.uid();
end;
$$;

grant execute on function public.sync_identity_session_link() to authenticated;
grant execute on function public.get_identity_context() to authenticated;

commit;
