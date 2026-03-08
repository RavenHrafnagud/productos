-- -------------------------------------------------------------------------
-- Ajusta estructura de operaciones.locales:
-- 1) Elimina gerente_persona_id.
-- 2) Renombra activo -> estado.
-- 3) Normaliza estado como boolean NOT NULL con default true.
-- -------------------------------------------------------------------------
begin;

alter table if exists operaciones.locales
  drop column if exists gerente_persona_id cascade;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'operaciones'
      and table_name = 'locales'
      and column_name = 'activo'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'operaciones'
      and table_name = 'locales'
      and column_name = 'estado'
  ) then
    execute 'alter table operaciones.locales rename column activo to estado';
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'operaciones'
      and table_name = 'locales'
      and column_name = 'estado'
  ) then
    execute 'update operaciones.locales set estado = true where estado is null';
    execute 'alter table operaciones.locales alter column estado set default true';
    execute 'alter table operaciones.locales alter column estado set not null';
  end if;
end $$;

commit;
