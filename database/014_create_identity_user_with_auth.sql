-- -------------------------------------------------------------------------
-- Crea helper seguro para alta completa de usuario:
-- 1) Crea auth.users + auth.identities.
-- 2) Crea identidad.personas.
-- 3) Crea identidad.usuarios vinculado con rol.
-- Requiere que quien ejecute sea admin de negocio (public.is_admin_user).
-- -------------------------------------------------------------------------
begin;

create extension if not exists pgcrypto with schema extensions;

create or replace function public.create_identity_user_account(
  p_email text,
  p_password text,
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
set search_path = public, auth, identidad, extensions
as $$
declare
  v_user_id uuid;
  v_persona_id uuid;
  v_tipo_documento_type text;
  v_email text;
  v_numero_documento text;
  v_nombres text;
  v_apellidos text;
  v_instance_id uuid;
begin
  if auth.uid() is null or not public.is_admin_user(auth.uid()) then
    raise exception 'No autorizado para crear usuarios.';
  end if;

  v_email := lower(trim(p_email));
  v_numero_documento := trim(p_numero_documento);
  v_nombres := trim(p_nombres);
  v_apellidos := trim(p_apellidos);

  if v_email = '' or v_numero_documento = '' or v_nombres = '' or v_apellidos = '' then
    raise exception 'Email, documento, nombres y apellidos son obligatorios.';
  end if;

  if length(coalesce(p_password, '')) < 12
    or p_password !~ '[A-Z]'
    or p_password !~ '[a-z]'
    or p_password !~ '[0-9]'
    or p_password !~ '[^A-Za-z0-9]' then
    raise exception 'La contrasena no cumple politica de seguridad.';
  end if;

  if exists (select 1 from auth.users u where lower(u.email) = v_email) then
    raise exception 'Ya existe un usuario auth con ese correo.';
  end if;

  if exists (select 1 from identidad.personas p where p.numero_documento = v_numero_documento) then
    raise exception 'Ya existe una persona con ese numero de documento.';
  end if;

  if not exists (select 1 from identidad.roles r where r.id = p_rol_id) then
    raise exception 'El rol indicado no existe.';
  end if;

  -- Toma la instancia configurada en Auth.
  select i.id
  into v_instance_id
  from auth.instances i
  order by i.created_at asc
  limit 1;

  if v_instance_id is null then
    select u.instance_id
    into v_instance_id
    from auth.users u
    where u.instance_id is not null
    order by u.created_at asc
    limit 1;
  end if;

  if v_instance_id is null then
    raise exception 'No se encontro instance_id valido. Ejecuta database/022_repair_auth_instances.sql en Supabase.';
  end if;

  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  )
  values (
    v_instance_id,
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    v_email,
    crypt(p_password, gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', concat_ws(' ', v_nombres, v_apellidos)),
    now(),
    now()
  )
  returning id into v_user_id;

  insert into auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  )
  values (
    gen_random_uuid(),
    v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', v_email),
    'email',
    v_user_id::text,
    now(),
    now(),
    now()
  );

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
    v_email, nullif(trim(p_direccion), ''), nullif(trim(p_ciudad), ''), trim(p_pais);

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
    v_user_id,
    v_persona_id,
    p_rol_id,
    now(),
    null,
    true,
    now(),
    now()
  );

  return v_user_id;
end;
$$;

grant execute on function public.create_identity_user_account(
  text, text, text, text, text, text, smallint, text, text, text, text
) to authenticated;

commit;
