-- -------------------------------------------------------------------------
-- Integra detalle_venta dentro de ventas.ventas.
-- 1) Agrega columnas producto_id, cantidad y precio_unitario en ventas.
-- 2) Migra informacion desde detalle_venta/detalle_ventas si existe.
-- 3) Elimina tablas de detalle legacy.
-- 4) Actualiza funciones de borrado en cascada.
-- -------------------------------------------------------------------------
begin;

create extension if not exists pgcrypto;

alter table if exists ventas.ventas
  add column if not exists producto_id uuid;

alter table if exists ventas.ventas
  add column if not exists cantidad numeric(14, 2);

alter table if exists ventas.ventas
  add column if not exists precio_unitario numeric(14, 2);

do $$
begin
  if to_regclass('ventas.detalle_venta') is not null then
    execute $q$
      with detail_resume as (
        select
          dv.venta_id,
          case
            when count(distinct dv.producto_id) = 1 then min(dv.producto_id::text)::uuid
            else null
          end as producto_id,
          sum(dv.cantidad)::numeric(14, 2) as cantidad,
          case
            when sum(dv.cantidad) > 0
              then (sum(dv.cantidad * dv.precio_unitario) / sum(dv.cantidad))::numeric(14, 2)
            else max(dv.precio_unitario)::numeric(14, 2)
          end as precio_unitario
        from ventas.detalle_venta dv
        group by dv.venta_id
      )
      update ventas.ventas v
      set
        producto_id = dr.producto_id,
        cantidad = dr.cantidad,
        precio_unitario = dr.precio_unitario
      from detail_resume dr
      where v.id = dr.venta_id
    $q$;
  elsif to_regclass('ventas.detalle_ventas') is not null then
    execute $q$
      with detail_resume as (
        select
          dv.venta_id,
          case
            when count(distinct dv.producto_id) = 1 then min(dv.producto_id::text)::uuid
            else null
          end as producto_id,
          sum(dv.cantidad)::numeric(14, 2) as cantidad,
          case
            when sum(dv.cantidad) > 0
              then (sum(dv.cantidad * dv.precio_unitario) / sum(dv.cantidad))::numeric(14, 2)
            else max(dv.precio_unitario)::numeric(14, 2)
          end as precio_unitario
        from ventas.detalle_ventas dv
        group by dv.venta_id
      )
      update ventas.ventas v
      set
        producto_id = dr.producto_id,
        cantidad = dr.cantidad,
        precio_unitario = dr.precio_unitario
      from detail_resume dr
      where v.id = dr.venta_id
    $q$;
  elsif to_regclass('public.detalle_venta') is not null then
    execute $q$
      with detail_resume as (
        select
          dv.venta_id,
          case
            when count(distinct dv.producto_id) = 1 then min(dv.producto_id::text)::uuid
            else null
          end as producto_id,
          sum(dv.cantidad)::numeric(14, 2) as cantidad,
          case
            when sum(dv.cantidad) > 0
              then (sum(dv.cantidad * dv.precio_unitario) / sum(dv.cantidad))::numeric(14, 2)
            else max(dv.precio_unitario)::numeric(14, 2)
          end as precio_unitario
        from public.detalle_venta dv
        group by dv.venta_id
      )
      update ventas.ventas v
      set
        producto_id = dr.producto_id,
        cantidad = dr.cantidad,
        precio_unitario = dr.precio_unitario
      from detail_resume dr
      where v.id = dr.venta_id
    $q$;
  elsif to_regclass('public.detalle_ventas') is not null then
    execute $q$
      with detail_resume as (
        select
          dv.venta_id,
          case
            when count(distinct dv.producto_id) = 1 then min(dv.producto_id::text)::uuid
            else null
          end as producto_id,
          sum(dv.cantidad)::numeric(14, 2) as cantidad,
          case
            when sum(dv.cantidad) > 0
              then (sum(dv.cantidad * dv.precio_unitario) / sum(dv.cantidad))::numeric(14, 2)
            else max(dv.precio_unitario)::numeric(14, 2)
          end as precio_unitario
        from public.detalle_ventas dv
        group by dv.venta_id
      )
      update ventas.ventas v
      set
        producto_id = dr.producto_id,
        cantidad = dr.cantidad,
        precio_unitario = dr.precio_unitario
      from detail_resume dr
      where v.id = dr.venta_id
    $q$;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    where c.conname = 'ventas_producto_id_fkey'
      and c.conrelid = 'ventas.ventas'::regclass
  ) then
    alter table ventas.ventas
      add constraint ventas_producto_id_fkey
      foreign key (producto_id) references catalogo.productos(id)
      on update cascade on delete restrict;
  end if;
end $$;

drop table if exists ventas.detalle_venta cascade;
drop table if exists ventas.detalle_ventas cascade;
drop table if exists public.detalle_venta cascade;
drop table if exists public.detalle_ventas cascade;

create or replace function public.delete_product_cascade(p_product_id uuid)
returns void
language plpgsql
security definer
set search_path = public, catalogo, operaciones, ventas
as $$
begin
  if to_regclass('ventas.ventas') is not null then
    execute 'delete from ventas.ventas where producto_id = $1' using p_product_id;
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
