-- -------------------------------------------------------------------------
-- Refactor del esquema identidad:
-- 1) personas.activo -> personas.estado
-- 2) elimina roles.activo
-- 3) mueve persona_roles(rol_id, fecha_asignacion) hacia usuarios
-- 4) usuarios.activo -> usuarios.estado
-- -------------------------------------------------------------------------
begin;

-- 1) personas.activo -> estado
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'identidad'
      and table_name = 'personas'
      and column_name = 'activo'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'identidad'
      and table_name = 'personas'
      and column_name = 'estado'
  ) then
    execute 'alter table identidad.personas rename column activo to estado';
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'identidad'
      and table_name = 'personas'
      and column_name = 'estado'
  ) then
    execute 'update identidad.personas set estado = true where estado is null';
    execute 'alter table identidad.personas alter column estado set default true';
    execute 'alter table identidad.personas alter column estado set not null';
  end if;
end $$;

-- 2) usuarios.activo -> estado
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'identidad'
      and table_name = 'usuarios'
      and column_name = 'activo'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'identidad'
      and table_name = 'usuarios'
      and column_name = 'estado'
  ) then
    execute 'alter table identidad.usuarios rename column activo to estado';
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'identidad'
      and table_name = 'usuarios'
      and column_name = 'estado'
  ) then
    execute 'update identidad.usuarios set estado = true where estado is null';
    execute 'alter table identidad.usuarios alter column estado set default true';
    execute 'alter table identidad.usuarios alter column estado set not null';
  end if;
end $$;

-- 3) roles.activo se elimina.
alter table if exists identidad.roles
  drop column if exists activo;

-- 4) Usuarios recibe rol_id y fecha_asignacion.
do $$
declare
  role_id_type text;
begin
  if to_regclass('identidad.usuarios') is null or to_regclass('identidad.roles') is null then
    return;
  end if;

  select pg_catalog.format_type(a.atttypid, a.atttypmod)
  into role_id_type
  from pg_attribute a
  join pg_class t on t.oid = a.attrelid
  join pg_namespace n on n.oid = t.relnamespace
  where n.nspname = 'identidad'
    and t.relname = 'roles'
    and a.attname = 'id'
    and a.attnum > 0
    and not a.attisdropped
  limit 1;

  if role_id_type is null then
    return;
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'identidad'
      and table_name = 'usuarios'
      and column_name = 'rol_id'
  ) then
    execute format('alter table identidad.usuarios add column rol_id %s', role_id_type);
  end if;
end $$;

alter table if exists identidad.usuarios
  add column if not exists fecha_asignacion timestamptz;

-- Migra asignaciones desde persona_roles si existe.
do $$
begin
  if to_regclass('identidad.persona_roles') is null then
    return;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'identidad'
      and table_name = 'persona_roles'
      and column_name = 'activo'
  ) then
    execute $q$
      with latest_role as (
        select distinct on (pr.persona_id)
          pr.persona_id,
          pr.rol_id,
          pr.fecha_asignacion
        from identidad.persona_roles pr
        order by
          pr.persona_id,
          coalesce(pr.activo, true) desc,
          pr.fecha_asignacion desc nulls last,
          pr.id desc
      )
      update identidad.usuarios u
      set
        rol_id = lr.rol_id,
        fecha_asignacion = coalesce(u.fecha_asignacion, lr.fecha_asignacion, now())
      from latest_role lr
      where u.persona_id = lr.persona_id
        and (u.rol_id is null or u.fecha_asignacion is null)
    $q$;
  else
    execute $q$
      with latest_role as (
        select distinct on (pr.persona_id)
          pr.persona_id,
          pr.rol_id,
          pr.fecha_asignacion
        from identidad.persona_roles pr
        order by
          pr.persona_id,
          pr.fecha_asignacion desc nulls last,
          pr.id desc
      )
      update identidad.usuarios u
      set
        rol_id = lr.rol_id,
        fecha_asignacion = coalesce(u.fecha_asignacion, lr.fecha_asignacion, now())
      from latest_role lr
      where u.persona_id = lr.persona_id
        and (u.rol_id is null or u.fecha_asignacion is null)
    $q$;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    where c.conname = 'usuarios_rol_id_fkey'
      and c.conrelid = 'identidad.usuarios'::regclass
  ) then
    alter table identidad.usuarios
      add constraint usuarios_rol_id_fkey
      foreign key (rol_id) references identidad.roles(id)
      on update cascade
      on delete set null;
  end if;
end $$;

create index if not exists idx_usuarios_rol_id on identidad.usuarios (rol_id);

-- Elimina tabla legacy de asignaciones.
drop table if exists identidad.persona_roles cascade;

-- Reemplaza helper de permisos admin acorde al nuevo modelo.
create or replace function public.is_admin_user(p_uid uuid)
returns boolean
language sql
security definer
stable
set search_path = public, identidad
as $$
  select exists (
    select 1
    from identidad.usuarios u
    join identidad.roles r on r.id = u.rol_id
    where u.id = p_uid
      and coalesce(u.estado, true) = true
      and lower(r.nombre) = 'admin'
  );
$$;

grant execute on function public.is_admin_user(uuid) to authenticated;

commit;
