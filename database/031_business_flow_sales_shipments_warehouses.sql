-- -------------------------------------------------------------------------
-- Extiende flujo de negocio para ventas/envios/almacenes.
-- 1) Ventas: tipo de venta, cliente individual, flujo de envio y agrupacion.
-- 2) Envios: tipo de envio y referencia al grupo de venta.
-- 3) Almacenes: barrio y municipio.
-- -------------------------------------------------------------------------
begin;

create extension if not exists pgcrypto with schema extensions;

-- =========================
-- Ventas
-- =========================
alter table if exists ventas.ventas
  add column if not exists tipo_venta text;

update ventas.ventas
set tipo_venta = 'SUCURSAL'
where tipo_venta is null;

alter table if exists ventas.ventas
  alter column tipo_venta set default 'SUCURSAL';

alter table if exists ventas.ventas
  alter column tipo_venta set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'ventas_tipo_venta_check'
      and conrelid = 'ventas.ventas'::regclass
  ) then
    alter table ventas.ventas
      add constraint ventas_tipo_venta_check
      check (tipo_venta in ('SUCURSAL', 'INDIVIDUAL'));
  end if;
end $$;

alter table if exists ventas.ventas
  add column if not exists cliente_documento text;

alter table if exists ventas.ventas
  add column if not exists cliente_nombre text;

alter table if exists ventas.ventas
  add column if not exists cliente_pais text;

alter table if exists ventas.ventas
  add column if not exists cliente_ciudad text;

alter table if exists ventas.ventas
  add column if not exists envio_responsable text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'ventas_envio_responsable_check'
      and conrelid = 'ventas.ventas'::regclass
  ) then
    alter table ventas.ventas
      add constraint ventas_envio_responsable_check
      check (envio_responsable is null or envio_responsable in ('CLIENTE', 'NOSOTROS'));
  end if;
end $$;

alter table if exists ventas.ventas
  add column if not exists requiere_envio boolean default false;

update ventas.ventas
set requiere_envio = false
where requiere_envio is null;

alter table if exists ventas.ventas
  alter column requiere_envio set default false;

alter table if exists ventas.ventas
  alter column requiere_envio set not null;

alter table if exists ventas.ventas
  add column if not exists envio_registrado boolean default false;

update ventas.ventas
set envio_registrado = false
where envio_registrado is null;

alter table if exists ventas.ventas
  alter column envio_registrado set default false;

alter table if exists ventas.ventas
  alter column envio_registrado set not null;

alter table if exists ventas.ventas
  add column if not exists referencia_grupo uuid;

alter table if exists ventas.ventas
  add column if not exists comision_porcentaje numeric(5, 2) default 0;

update ventas.ventas
set comision_porcentaje = 0
where comision_porcentaje is null;

alter table if exists ventas.ventas
  alter column comision_porcentaje set default 0;

alter table if exists ventas.ventas
  alter column comision_porcentaje set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'ventas_comision_porcentaje_check'
      and conrelid = 'ventas.ventas'::regclass
  ) then
    alter table ventas.ventas
      add constraint ventas_comision_porcentaje_check
      check (comision_porcentaje >= 0 and comision_porcentaje <= 100);
  end if;
end $$;

alter table if exists ventas.ventas
  add column if not exists comision_valor numeric(14, 2) default 0;

update ventas.ventas
set comision_valor = 0
where comision_valor is null;

alter table if exists ventas.ventas
  alter column comision_valor set default 0;

alter table if exists ventas.ventas
  alter column comision_valor set not null;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'ventas'
      and table_name = 'ventas'
      and column_name = 'local_id'
      and is_nullable = 'NO'
  ) then
    alter table ventas.ventas
      alter column local_id drop not null;
  end if;
end $$;

create index if not exists ventas_tipo_venta_idx on ventas.ventas (tipo_venta);
create index if not exists ventas_referencia_grupo_idx on ventas.ventas (referencia_grupo);
create index if not exists ventas_requiere_envio_idx on ventas.ventas (requiere_envio, envio_registrado);
create index if not exists ventas_cliente_documento_idx on ventas.ventas (cliente_documento);

-- =========================
-- Envios
-- =========================
alter table if exists ventas.envios
  add column if not exists tipo_envio text;

update ventas.envios
set tipo_envio = case
  when upper(coalesce(canal_venta, 'DIRECTO')) = 'TIENDA' then 'SUCURSAL'
  else 'INDIVIDUAL'
end
where tipo_envio is null;

alter table if exists ventas.envios
  alter column tipo_envio set default 'SUCURSAL';

alter table if exists ventas.envios
  alter column tipo_envio set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'envios_tipo_envio_check'
      and conrelid = 'ventas.envios'::regclass
  ) then
    alter table ventas.envios
      add constraint envios_tipo_envio_check
      check (tipo_envio in ('SUCURSAL', 'INDIVIDUAL'));
  end if;
end $$;

alter table if exists ventas.envios
  add column if not exists referencia_venta_grupo uuid;

alter table if exists ventas.envios
  add column if not exists cliente_documento text;

alter table if exists ventas.envios
  add column if not exists cliente_nombre text;

create index if not exists envios_tipo_envio_idx on ventas.envios (tipo_envio);
create index if not exists envios_referencia_venta_grupo_idx on ventas.envios (referencia_venta_grupo);
create index if not exists envios_cliente_documento_idx on ventas.envios (cliente_documento);

-- =========================
-- Almacenes
-- =========================
alter table if exists operaciones.almacenes
  add column if not exists barrio text;

alter table if exists operaciones.almacenes
  add column if not exists municipio text;

commit;
