-- -------------------------------------------------------------------------
-- Helpers RPC para gestion de identidad desde frontend:
-- 1) Perfil del usuario autenticado (nombre + rol).
-- 2) Listado de usuarios auth con/ sin perfil en identidad.
-- 3) Creacion de roles por RPC.
-- 4) Completar perfil de usuarios auth ya existentes.
-- 5) Asignar rol a un usuario existente.
-- -------------------------------------------------------------------------
begin;

create extension if not exists pgcrypto;

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
stable
set search_path = public, auth, identidad
as $$
begin
  if auth.uid() is null then
    raise exception 'No hay sesion autenticada.';
  end if;

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

create or replace function public.list_identity_roles()
returns table (
  id smallint,
  nombre text,
  descripcion text
)
language plpgsql
security definer
stable
set search_path = public, identidad
as $$
begin
  if auth.uid() is null or not public.is_admin_user(auth.uid()) then
    raise exception 'No autorizado para consultar roles.';
  end if;

  return query
  select
    r.id::smallint,
    r.nombre::text,
    r.descripcion::text
  from identidad.roles r
  order by lower(r.nombre);
end;
$$;

create or replace function public.create_identity_role(
  p_nombre text,
  p_descripcion text default null
)
returns smallint
language plpgsql
security definer
set search_path = public, identidad
as $$
declare
  v_nombre text;
  v_descripcion text;
  v_role_id smallint;
begin
  if auth.uid() is null or not public.is_admin_user(auth.uid()) then
    raise exception 'No autorizado para crear roles.';
  end if;

  v_nombre := lower(trim(p_nombre));
  v_descripcion := nullif(trim(coalesce(p_descripcion, '')), '');

  if v_nombre = '' then
    raise exception 'El nombre del rol es obligatorio.';
  end if;

  insert into identidad.roles (nombre, descripcion, created_at)
  values (v_nombre, v_descripcion, now())
  on conflict (nombre) do update
    set descripcion = coalesce(excluded.descripcion, identidad.roles.descripcion)
  returning id into v_role_id;

  return v_role_id;
end;
$$;

create or replace function public.list_identity_users()
returns table (
  auth_user_id uuid,
  email text,
  persona_id uuid,
  estado boolean,
  rol_id smallint,
  rol_nombre text,
  fecha_asignacion timestamptz,
  tipo_documento text,
  numero_documento text,
  nombres text,
  apellidos text,
  telefono text,
  ciudad text,
  pais text,
  profile_complete boolean
)
language plpgsql
security definer
stable
set search_path = public, auth, identidad
as $$
begin
  if auth.uid() is null or not public.is_admin_user(auth.uid()) then
    raise exception 'No autorizado para consultar usuarios.';
  end if;

  return query
  select
    au.id::uuid as auth_user_id,
    au.email::text,
    p.id::uuid as persona_id,
    coalesce(u.estado, p.estado, true)::boolean as estado,
    u.rol_id::smallint,
    r.nombre::text as rol_nombre,
    u.fecha_asignacion::timestamptz,
    p.tipo_documento::text as tipo_documento,
    p.numero_documento::text,
    p.nombres::text,
    p.apellidos::text,
    p.telefono::text,
    p.ciudad::text,
    p.pais::text,
    (
      u.id is not null
      and p.id is not null
      and nullif(trim(coalesce(p.numero_documento, '')), '') is not null
      and nullif(trim(coalesce(p.nombres, '')), '') is not null
      and nullif(trim(coalesce(p.apellidos, '')), '') is not null
      and u.rol_id is not null
    )::boolean as profile_complete
  from auth.users au
  left join identidad.usuarios u on u.id = au.id
  left join identidad.personas p on p.id = u.persona_id
  left join identidad.roles r on r.id = u.rol_id
  order by au.created_at desc, au.email asc;
end;
$$;

create or replace function public.complete_identity_user_profile(
  p_auth_user_id uuid,
  p_tipo_documento text,
  p_numero_documento text,
  p_nombres text,
  p_apellidos text,
  p_rol_id smallint,
  p_telefono text default null,
  p_direccion text default null,
  p_ciudad text default null,
  p_pais text default 'CO'
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, identidad
as $$
declare
  v_tipo_documento_type text;
  v_email text;
  v_persona_id uuid;
  v_numero_documento text;
  v_nombres text;
  v_apellidos text;
  v_pais text;
begin
  if auth.uid() is null or not public.is_admin_user(auth.uid()) then
    raise exception 'No autorizado para completar perfil.';
  end if;

  if p_auth_user_id is null then
    raise exception 'Debes indicar el usuario auth.';
  end if;

  select u.email
  into v_email
  from auth.users u
  where u.id = p_auth_user_id
  limit 1;

  if v_email is null then
    raise exception 'No existe el usuario en auth.users.';
  end if;

  if not exists (select 1 from identidad.roles r where r.id = p_rol_id) then
    raise exception 'El rol indicado no existe.';
  end if;

  v_numero_documento := trim(coalesce(p_numero_documento, ''));
  v_nombres := trim(coalesce(p_nombres, ''));
  v_apellidos := trim(coalesce(p_apellidos, ''));
  v_pais := trim(coalesce(p_pais, 'CO'));

  if v_numero_documento = '' or v_nombres = '' or v_apellidos = '' then
    raise exception 'Documento, nombres y apellidos son obligatorios.';
  end if;

  select pg_catalog.format_type(a.atttypid, a.atttypmod)
  into v_tipo_documento_type
  from pg_attribute a
  join pg_class t on t.oid = a.attrelid
  join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'identidad'
    and t.relname = 'personas'
    and a.attname = 'tipo_documento'
    and a.attnum > 0
    and not a.attisdropped
  limit 1;

  if v_tipo_documento_type is null then
    raise exception 'No se encontro el tipo de documento de identidad.personas.';
  end if;

  select u.persona_id
  into v_persona_id
  from identidad.usuarios u
  where u.id = p_auth_user_id
  limit 1;

  if v_persona_id is null then
    begin
      execute format(
        'insert into identidad.personas (
          tipo_documento,
          numero_documento,
          nombres,
          apellidos,
          telefono,
          email,
          direccion,
          ciudad,
          pais,
          estado,
          created_at,
          updated_at
        )
        values (
          ($1)::%s,
          $2, $3, $4, $5, $6, $7, $8, coalesce(nullif($9, ''''), ''CO''), true, now(), now()
        )
        returning id',
        v_tipo_documento_type
      )
      into v_persona_id
      using trim(p_tipo_documento), v_numero_documento, v_nombres, v_apellidos, nullif(trim(p_telefono), ''),
        v_email, nullif(trim(p_direccion), ''), nullif(trim(p_ciudad), ''), v_pais;
    exception
      when unique_violation then
        raise exception 'Ya existe una persona con ese numero de documento.';
    end;
  else
    begin
      execute format(
        'update identidad.personas
         set
           tipo_documento = ($1)::%s,
           numero_documento = $2,
           nombres = $3,
           apellidos = $4,
           telefono = $5,
           email = $6,
           direccion = $7,
           ciudad = $8,
           pais = coalesce(nullif($9, ''''), ''CO''),
           estado = true,
           updated_at = now()
         where id = $10',
        v_tipo_documento_type
      )
      using trim(p_tipo_documento), v_numero_documento, v_nombres, v_apellidos, nullif(trim(p_telefono), ''),
        v_email, nullif(trim(p_direccion), ''), nullif(trim(p_ciudad), ''), v_pais, v_persona_id;
    exception
      when unique_violation then
        raise exception 'Ya existe una persona con ese numero de documento.';
    end;
  end if;

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
    p_auth_user_id,
    v_persona_id,
    p_rol_id,
    now(),
    null,
    true,
    now(),
    now()
  )
  on conflict (id) do update
    set persona_id = excluded.persona_id,
        rol_id = excluded.rol_id,
        fecha_asignacion = coalesce(identidad.usuarios.fecha_asignacion, excluded.fecha_asignacion),
        estado = true,
        updated_at = now();

  return p_auth_user_id;
end;
$$;

create or replace function public.assign_identity_role_to_user(
  p_auth_user_id uuid,
  p_rol_id smallint
)
returns void
language plpgsql
security definer
set search_path = public, identidad
as $$
begin
  if auth.uid() is null or not public.is_admin_user(auth.uid()) then
    raise exception 'No autorizado para asignar rol.';
  end if;

  if p_auth_user_id is null then
    raise exception 'Debes indicar el usuario.';
  end if;

  if not exists (select 1 from identidad.roles r where r.id = p_rol_id) then
    raise exception 'El rol indicado no existe.';
  end if;

  update identidad.usuarios
  set
    rol_id = p_rol_id,
    fecha_asignacion = now(),
    updated_at = now()
  where id = p_auth_user_id;

  if not found then
    raise exception 'El usuario de identidad no existe para asignar rol.';
  end if;
end;
$$;

grant execute on function public.get_identity_context() to authenticated;
grant execute on function public.list_identity_roles() to authenticated;
grant execute on function public.create_identity_role(text, text) to authenticated;
grant execute on function public.list_identity_users() to authenticated;
grant execute on function public.complete_identity_user_profile(
  uuid, text, text, text, text, smallint, text, text, text, text
) to authenticated;
grant execute on function public.assign_identity_role_to_user(uuid, smallint) to authenticated;

commit;
