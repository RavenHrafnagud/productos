-- -------------------------------------------------------------------------
-- Ajusta estructura de catalogo.productos:
-- 1) Elimina precio_compra.
-- 2) Renombra activo -> estado.
-- 3) Normaliza estado como boolean NOT NULL con default true.
-- -------------------------------------------------------------------------
begin;

alter table if exists catalogo.productos
  drop column if exists precio_compra;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'catalogo'
      and table_name = 'productos'
      and column_name = 'activo'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'catalogo'
      and table_name = 'productos'
      and column_name = 'estado'
  ) then
    execute 'alter table catalogo.productos rename column activo to estado';
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'catalogo'
      and table_name = 'productos'
      and column_name = 'estado'
  ) then
    execute 'update catalogo.productos set estado = true where estado is null';
    execute 'alter table catalogo.productos alter column estado set default true';
    execute 'alter table catalogo.productos alter column estado set not null';
  end if;
end $$;

commit;
