-- -------------------------------------------------------------------------
-- Descuento global en ventas:
-- 1) Agrega columnas descuento_porcentaje y descuento_valor en ventas.ventas.
-- 2) Backfill inicial a partir de descuento/comision_valor existente.
-- Nota: descuento (legacy) queda como total de deducciones
--       = comision_valor + descuento_valor.
-- -------------------------------------------------------------------------
begin;

alter table if exists ventas.ventas
  add column if not exists descuento_porcentaje numeric(5, 2) default 0;

alter table if exists ventas.ventas
  add column if not exists descuento_valor numeric(14, 2) default 0;

update ventas.ventas
set
  descuento_valor = greatest(coalesce(descuento, 0) - coalesce(comision_valor, 0), 0),
  descuento_porcentaje = case
    when coalesce(subtotal, 0) > 0 then
      round(
        (greatest(coalesce(descuento, 0) - coalesce(comision_valor, 0), 0) / subtotal) * 100,
        2
      )
    else 0
  end
where descuento_valor is null
   or descuento_porcentaje is null;

update ventas.ventas
set descuento_valor = 0
where descuento_valor is null;

update ventas.ventas
set descuento_porcentaje = 0
where descuento_porcentaje is null;

alter table if exists ventas.ventas
  alter column descuento_porcentaje set default 0;

alter table if exists ventas.ventas
  alter column descuento_porcentaje set not null;

alter table if exists ventas.ventas
  alter column descuento_valor set default 0;

alter table if exists ventas.ventas
  alter column descuento_valor set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'ventas_descuento_porcentaje_check'
      and conrelid = 'ventas.ventas'::regclass
  ) then
    alter table ventas.ventas
      add constraint ventas_descuento_porcentaje_check
      check (descuento_porcentaje >= 0 and descuento_porcentaje <= 100);
  end if;
end $$;

create index if not exists ventas_descuento_porcentaje_idx on ventas.ventas (descuento_porcentaje);

commit;
