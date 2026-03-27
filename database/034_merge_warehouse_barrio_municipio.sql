-- -------------------------------------------------------------------------
-- Unifica barrio y municipio de almacenes en un solo campo:
-- 1) Crea operaciones.almacenes.localidad.
-- 2) Migra datos desde barrio/municipio sin perder informacion.
-- Nota: barrio y municipio se conservan como legacy para compatibilidad.
-- -------------------------------------------------------------------------
begin;

alter table if exists operaciones.almacenes
  add column if not exists localidad text;

do $$
begin
  if to_regclass('operaciones.almacenes') is null then
    return;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'operaciones'
      and table_name = 'almacenes'
      and column_name = 'barrio'
  ) and exists (
    select 1
    from information_schema.columns
    where table_schema = 'operaciones'
      and table_name = 'almacenes'
      and column_name = 'municipio'
  ) then
    update operaciones.almacenes
    set localidad = nullif(
      trim(
        concat_ws(
          ' / ',
          nullif(trim(barrio), ''),
          nullif(trim(municipio), '')
        )
      ),
      ''
    )
    where coalesce(nullif(trim(localidad), ''), '') = '';
  elsif exists (
    select 1
    from information_schema.columns
    where table_schema = 'operaciones'
      and table_name = 'almacenes'
      and column_name = 'barrio'
  ) then
    update operaciones.almacenes
    set localidad = nullif(trim(barrio), '')
    where coalesce(nullif(trim(localidad), ''), '') = '';
  elsif exists (
    select 1
    from information_schema.columns
    where table_schema = 'operaciones'
      and table_name = 'almacenes'
      and column_name = 'municipio'
  ) then
    update operaciones.almacenes
    set localidad = nullif(trim(municipio), '')
    where coalesce(nullif(trim(localidad), ''), '') = '';
  end if;
end $$;

create index if not exists almacenes_localidad_idx on operaciones.almacenes (localidad);

commit;
