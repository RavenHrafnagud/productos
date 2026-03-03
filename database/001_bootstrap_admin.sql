-- -------------------------------------------------------------------------
-- Bootstrap de usuario administrador para "El Tarot como Guia"
-- Ejecutar UNA sola vez en Supabase SQL Editor con rol postgres.
-- -------------------------------------------------------------------------
begin;

create extension if not exists pgcrypto;

-- 1) Asegura existencia del rol "admin" en la tabla de negocio.
insert into identidad.roles (nombre, descripcion, activo, created_at)
values ('admin', 'Administrador principal', true, now())
on conflict (nombre) do nothing;

-- 2) Crea o actualiza usuario en Auth con password hash (nunca texto plano en BD).
with admin_data as (
  select
    'hrafnfreistudrr@gmail.com'::text as target_email,
    'admin@eltarotcomoguia.com'::text as legacy_email
),
password_data as (
  select
    crypt('$%&Heimdallr-Emperatriz123$%&', gen_salt('bf')) as pass_hash,
    target_email,
    legacy_email
  from admin_data
),
existing_auth as (
  select u.id, u.email
  from auth.users u
  cross join password_data p
  where lower(u.email) in (lower(p.target_email), lower(p.legacy_email))
  order by case when lower(u.email) = lower(p.target_email) then 0 else 1 end
  limit 1
),
updated_auth as (
  update auth.users u
  set
    email = p.target_email,
    encrypted_password = p.pass_hash,
    email_confirmed_at = coalesce(u.email_confirmed_at, now()),
    updated_at = now()
  from password_data p
  where u.id in (select id from existing_auth)
  returning u.id, u.email
),
inserted_auth as (
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
  select
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    p.target_email,
    p.pass_hash,
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"full_name":"Administrador El Tarot como Guia"}'::jsonb,
    now(),
    now()
  from password_data p
  where not exists (select 1 from existing_auth)
  returning id, email
),
resolved_auth as (
  select id, email from updated_auth
  union all
  select id, email from inserted_auth
),
ensure_identity as (
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
  select
    gen_random_uuid(),
    ra.id,
    jsonb_build_object('sub', ra.id::text, 'email', ra.email),
    'email',
    ra.id::text,
    now(),
    now(),
    now()
  from resolved_auth ra
  where not exists (
    select 1
    from auth.identities i
    where i.user_id = ra.id and i.provider = 'email'
  )
  returning user_id
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
  select
    'NIT',
    'ADMIN-TAROT-001',
    'Administrador',
    'Principal',
    p.target_email,
    true,
    now(),
    now()
  from password_data p
  on conflict (numero_documento) do update
    set email = excluded.email,
        activo = true,
        updated_at = now()
  returning id
),
resolved_persona as (
  select id from upsert_persona
  union all
  select p.id
  from identidad.personas p
  where p.numero_documento = 'ADMIN-TAROT-001'
    and not exists (select 1 from upsert_persona)
  limit 1
),
upsert_usuario as (
  insert into identidad.usuarios (
    id,
    persona_id,
    ultimo_acceso,
    activo,
    created_at,
    updated_at
  )
  select
    ra.id,
    rp.id,
    null,
    true,
    now(),
    now()
  from resolved_auth ra
  cross join resolved_persona rp
  on conflict (id) do update
    set persona_id = excluded.persona_id,
        activo = true,
        updated_at = now()
  returning persona_id
)
insert into identidad.persona_roles (persona_id, rol_id, fecha_asignacion, activo)
select
  rp.id,
  r.id,
  now(),
  true
from resolved_persona rp
join identidad.roles r on lower(r.nombre) = 'admin'
where not exists (
  select 1
  from identidad.persona_roles pr
  where pr.persona_id = rp.id and pr.rol_id = r.id
);

commit;
