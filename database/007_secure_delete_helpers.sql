-- -------------------------------------------------------------------------
-- Helpers de eliminacion en cascada para panel admin.
-- Ejecutar en Supabase SQL Editor con rol postgres.
-- -------------------------------------------------------------------------
begin;

create or replace function public.delete_product_cascade(p_product_id uuid)
returns void
language plpgsql
security definer
set search_path = public, catalogo, operaciones, ventas
as $$
begin
  -- Modelo nuevo: ventas.producto_id integrado.
  if to_regclass('ventas.ventas') is not null and exists (
    select 1
    from information_schema.columns
    where table_schema = 'ventas'
      and table_name = 'ventas'
      and column_name = 'producto_id'
  ) then
    execute 'delete from ventas.ventas where producto_id = $1' using p_product_id;
  -- Compatibilidad temporal con modelos legacy.
  elsif to_regclass('ventas.detalle_venta') is not null then
    execute 'delete from ventas.detalle_venta where producto_id = $1' using p_product_id;
  elsif to_regclass('ventas.detalle_ventas') is not null then
    execute 'delete from ventas.detalle_ventas where producto_id = $1' using p_product_id;
  elsif to_regclass('public.detalle_venta') is not null then
    execute 'delete from public.detalle_venta where producto_id = $1' using p_product_id;
  elsif to_regclass('public.detalle_ventas') is not null then
    execute 'delete from public.detalle_ventas where producto_id = $1' using p_product_id;
  end if;

  if to_regclass('operaciones.movimientos_inventario') is not null then
    execute 'delete from operaciones.movimientos_inventario where producto_id = $1' using p_product_id;
  end if;

  if to_regclass('operaciones.inventario') is not null then
    execute 'delete from operaciones.inventario where producto_id = $1' using p_product_id;
  end if;

  execute 'delete from catalogo.productos where id = $1' using p_product_id;
end;
$$;

create or replace function public.delete_branch_cascade(p_branch_id uuid)
returns void
language plpgsql
security definer
set search_path = public, catalogo, operaciones, ventas
as $$
begin
  if to_regclass('ventas.ventas') is not null then
    -- Si aun existe detalle de venta legacy, lo limpia antes de borrar ventas.
    if to_regclass('ventas.detalle_venta') is not null then
      execute
        'delete from ventas.detalle_venta where venta_id in (select id from ventas.ventas where local_id = $1)'
      using p_branch_id;
    elsif to_regclass('ventas.detalle_ventas') is not null then
      execute
        'delete from ventas.detalle_ventas where venta_id in (select id from ventas.ventas where local_id = $1)'
      using p_branch_id;
    elsif to_regclass('public.detalle_venta') is not null then
      execute
        'delete from public.detalle_venta where venta_id in (select id from ventas.ventas where local_id = $1)'
      using p_branch_id;
    elsif to_regclass('public.detalle_ventas') is not null then
      execute
        'delete from public.detalle_ventas where venta_id in (select id from ventas.ventas where local_id = $1)'
      using p_branch_id;
    end if;

    execute 'delete from ventas.ventas where local_id = $1' using p_branch_id;
  end if;

  if to_regclass('operaciones.movimientos_inventario') is not null then
    execute 'delete from operaciones.movimientos_inventario where local_id = $1' using p_branch_id;
  end if;

  if to_regclass('operaciones.inventario') is not null then
    execute 'delete from operaciones.inventario where local_id = $1' using p_branch_id;
  end if;

  execute 'delete from operaciones.locales where id = $1' using p_branch_id;
end;
$$;

grant execute on function public.delete_product_cascade(uuid) to authenticated;
grant execute on function public.delete_branch_cascade(uuid) to authenticated;

commit;
