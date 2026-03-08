-- -------------------------------------------------------------------------
-- Repara permisos para crear sucursales (RLS locales) para el admin.
-- Ejecutar en Supabase SQL Editor con rol postgres.
-- -------------------------------------------------------------------------
begin;

-- 1) Asegura rol admin.
insert into identidad.roles (nombre, descripcion, created_at)
values ('admin', 'Administrador principal', now())
on conflict (nombre) do nothing;

-- 2) Busca usuario auth por correo y lo vincula a tablas de negocio.
with auth_admin as (
  select id, email
  from auth.users
  where lower(email) = lower('hrafnfreistudrr@gmail.com')
  limit 1
),
upsert_persona as (
  insert into identidad.personas (
    tipo_documento,
    numero_documento,
    nombres,
    apellidos,
    email,
    estado,
    created_at,
    updated_at
  )
  values (
    'NIT',
    'ADMIN-TAROT-001',
    'Administrador',
    'Principal',
    'hrafnfreistudrr@gmail.com',
    true,
    now(),
    now()
  )
  on conflict (numero_documento) do update
    set email = excluded.email,
        estado = true,
        updated_at = now()
  returning id
),
resolved_persona as (
  select id from upsert_persona
  union all
  select p.id from identidad.personas p where p.numero_documento = 'ADMIN-TAROT-001'
  limit 1
),
resolved_role as (
  select r.id as rol_id
  from identidad.roles r
  where lower(r.nombre) = 'admin'
  limit 1
)
insert into identidad.usuarios (id, persona_id, rol_id, fecha_asignacion, estado, created_at, updated_at)
select a.id, rp.id, rr.rol_id, now(), true, now(), now()
from auth_admin a
cross join resolved_persona rp
cross join resolved_role rr
on conflict (id) do update
  set persona_id = excluded.persona_id,
      rol_id = coalesce(excluded.rol_id, identidad.usuarios.rol_id),
      fecha_asignacion = coalesce(identidad.usuarios.fecha_asignacion, excluded.fecha_asignacion),
      estado = true,
      updated_at = now();

commit;
