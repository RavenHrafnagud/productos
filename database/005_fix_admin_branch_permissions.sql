-- -------------------------------------------------------------------------
-- Repara permisos para crear sucursales (RLS locales) para el admin.
-- Ejecutar en Supabase SQL Editor con rol postgres.
-- -------------------------------------------------------------------------
begin;

-- 1) Asegura rol admin.
insert into identidad.roles (nombre, descripcion, activo, created_at)
values ('admin', 'Administrador principal', true, now())
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
    activo,
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
        activo = true,
        updated_at = now()
  returning id
),
resolved_persona as (
  select id from upsert_persona
  union all
  select p.id from identidad.personas p where p.numero_documento = 'ADMIN-TAROT-001'
  limit 1
)
insert into identidad.usuarios (id, persona_id, activo, created_at, updated_at)
select a.id, rp.id, true, now(), now()
from auth_admin a
cross join resolved_persona rp
on conflict (id) do update
  set persona_id = excluded.persona_id,
      activo = true,
      updated_at = now();

-- 3) Asigna rol admin a la persona.
insert into identidad.persona_roles (persona_id, rol_id, fecha_asignacion, activo)
select p.id, r.id, now(), true
from identidad.personas p
join identidad.roles r on lower(r.nombre) = 'admin'
where p.numero_documento = 'ADMIN-TAROT-001'
and not exists (
  select 1
  from identidad.persona_roles pr
  where pr.persona_id = p.id and pr.rol_id = r.id
);

commit;
