-- -------------------------------------------------------------------------
-- Actualiza datos de perfil de un usuario existente sin tocar su rol.
-- Requiere admin de negocio (public.is_admin_user).
-- -------------------------------------------------------------------------
begin;

create or replace function public.update_identity_user_profile(
  p_auth_user_id uuid,
  p_tipo_documento text,
  p_numero_documento text,
  p_nombres text,
  p_apellidos text,
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
begin
  if auth.uid() is null or not public.is_admin_user(auth.uid()) then
    raise exception 'No autorizado para editar usuarios.';
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

  select u.persona_id
  into v_persona_id
  from identidad.usuarios u
  where u.id = p_auth_user_id
  limit 1;

  if v_persona_id is null then
    raise exception 'El usuario no tiene persona vinculada. Usa completar usuario.';
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
         updated_at = now()
       where id = $10',
      v_tipo_documento_type
    )
    using trim(p_tipo_documento), trim(p_numero_documento), trim(p_nombres), trim(p_apellidos),
      nullif(trim(p_telefono), ''), v_email, nullif(trim(p_direccion), ''), nullif(trim(p_ciudad), ''),
      trim(p_pais), v_persona_id;
  exception
    when unique_violation then
      raise exception 'Ya existe una persona con ese numero de documento.';
  end;

  update identidad.usuarios
  set updated_at = now()
  where id = p_auth_user_id;

  return p_auth_user_id;
end;
$$;

grant execute on function public.update_identity_user_profile(
  uuid, text, text, text, text, text, text, text, text
) to authenticated;

commit;
