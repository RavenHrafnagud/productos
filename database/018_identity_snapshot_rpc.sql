-- -------------------------------------------------------------------------
-- Snapshot robusto de identidad para frontend:
-- Retorna perfil + roles + usuarios en JSONB, evitando errores de tipado
-- de funciones TABLE(...).
-- -------------------------------------------------------------------------
begin;

create or replace function public.get_identity_admin_snapshot()
returns jsonb
language plpgsql
security definer
set search_path = public, auth, identidad
as $$
declare
  v_uid uuid;
  v_is_admin boolean;
  v_context jsonb;
  v_roles jsonb;
  v_users jsonb;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'No hay sesion autenticada.';
  end if;

  -- Intenta mantener el enlace auth -> identidad actualizado en cada consulta.
  perform public.sync_identity_session_link();
  v_is_admin := public.is_admin_user(v_uid);

  select jsonb_build_object(
    'auth_user_id', au.id::text,
    'email', au.email::text,
    'persona_id', p.id::text,
    'nombres', coalesce(p.nombres, ''),
    'apellidos', coalesce(p.apellidos, ''),
    'rol_id', u.rol_id,
    'rol_nombre', r.nombre,
    'estado', coalesce(u.estado, p.estado, true)
  )
  into v_context
  from auth.users au
  left join identidad.usuarios u on u.id = au.id
  left join identidad.personas p on p.id = u.persona_id
  left join identidad.roles r on r.id = u.rol_id
  where au.id = v_uid
  limit 1;

  if not v_is_admin then
    return jsonb_build_object(
      'context', v_context,
      'roles', '[]'::jsonb,
      'users', '[]'::jsonb,
      'is_admin', false
    );
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', r.id,
        'nombre', r.nombre,
        'descripcion', r.descripcion
      )
      order by lower(r.nombre)
    ),
    '[]'::jsonb
  )
  into v_roles
  from identidad.roles r;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'auth_user_id', au.id::text,
        'email', au.email::text,
        'persona_id', p.id::text,
        'estado', coalesce(u.estado, p.estado, true),
        'rol_id', u.rol_id,
        'rol_nombre', r.nombre,
        'fecha_asignacion', u.fecha_asignacion,
        'tipo_documento', p.tipo_documento::text,
        'numero_documento', p.numero_documento,
        'nombres', p.nombres,
        'apellidos', p.apellidos,
        'telefono', p.telefono,
        'ciudad', p.ciudad,
        'pais', p.pais,
        'profile_complete',
          (
            u.id is not null
            and p.id is not null
            and nullif(trim(coalesce(p.numero_documento, '')), '') is not null
            and nullif(trim(coalesce(p.nombres, '')), '') is not null
            and nullif(trim(coalesce(p.apellidos, '')), '') is not null
            and u.rol_id is not null
          )
      )
      order by au.created_at desc, au.email asc
    ),
    '[]'::jsonb
  )
  into v_users
  from auth.users au
  left join identidad.usuarios u on u.id = au.id
  left join identidad.personas p on p.id = u.persona_id
  left join identidad.roles r on r.id = u.rol_id;

  return jsonb_build_object(
    'context', v_context,
    'roles', v_roles,
    'users', v_users,
    'is_admin', true
  );
end;
$$;

grant execute on function public.get_identity_admin_snapshot() to authenticated;

commit;
