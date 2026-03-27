-- -------------------------------------------------------------------------
-- Ventas individuales desde almacen:
-- 1) Agrega ventas.ventas.almacen_id (origen para ventas individuales).
-- 2) Ajusta trigger de trazabilidad para descontar stock desde:
--    - operaciones.inventario (ventas tipo SUCURSAL)
--    - operaciones.inventario_almacen (ventas tipo INDIVIDUAL)
-- -------------------------------------------------------------------------
begin;

alter table if exists ventas.ventas
  add column if not exists almacen_id uuid;

do $$
begin
  if to_regclass('ventas.ventas') is null then
    return;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'ventas_almacen_id_fkey'
      and conrelid = 'ventas.ventas'::regclass
  ) then
    alter table ventas.ventas
      add constraint ventas_almacen_id_fkey
      foreign key (almacen_id) references operaciones.almacenes(id)
      on update cascade on delete set null;
  end if;
end $$;

create index if not exists ventas_almacen_id_idx on ventas.ventas (almacen_id);

create or replace function ventas.sync_inventory_from_sale()
returns trigger
language plpgsql
security definer
set search_path = public, auth, identidad, operaciones, ventas
as $$
declare
  v_old_type text;
  v_new_type text;
  v_has_branch_fn boolean;
  v_has_warehouse_fn boolean;
begin
  select to_regprocedure('operaciones.apply_inventory_delta(uuid,uuid,numeric,text,uuid,text)') is not null
  into v_has_branch_fn;

  select to_regprocedure('operaciones.apply_warehouse_inventory_delta(uuid,uuid,numeric,text,uuid,text)') is not null
  into v_has_warehouse_fn;

  v_new_type := upper(coalesce(new.tipo_venta, case when new.local_id is null then 'INDIVIDUAL' else 'SUCURSAL' end));

  if tg_op = 'UPDATE' then
    v_old_type := upper(coalesce(old.tipo_venta, case when old.local_id is null then 'INDIVIDUAL' else 'SUCURSAL' end));

    if coalesce(old.local_id::text, '') = coalesce(new.local_id::text, '')
      and coalesce(old.almacen_id::text, '') = coalesce(new.almacen_id::text, '')
      and coalesce(old.producto_id::text, '') = coalesce(new.producto_id::text, '')
      and coalesce(old.cantidad, 0) = coalesce(new.cantidad, 0)
      and coalesce(old.estado::text, '') = coalesce(new.estado::text, '')
      and coalesce(v_old_type, '') = coalesce(v_new_type, '') then
      return new;
    end if;

    if upper(coalesce(old.estado::text, '')) = 'CONFIRMADA'
      and old.producto_id is not null
      and coalesce(old.cantidad, 0) > 0 then
      if v_old_type = 'SUCURSAL' and old.local_id is not null and v_has_branch_fn then
        perform operaciones.apply_inventory_delta(
          old.local_id,
          old.producto_id,
          coalesce(old.cantidad, 0),
          'VENTA_REVERSA',
          old.id,
          'Reversion por ajuste/anulacion de venta en sucursal'
        );
      elsif v_old_type = 'INDIVIDUAL' and old.almacen_id is not null and v_has_warehouse_fn then
        perform operaciones.apply_warehouse_inventory_delta(
          old.almacen_id,
          old.producto_id,
          coalesce(old.cantidad, 0),
          'VENTA_REVERSA',
          old.id,
          'Reversion por ajuste/anulacion de venta individual'
        );
      end if;
    end if;
  end if;

  if upper(coalesce(new.estado::text, '')) = 'CONFIRMADA'
    and new.producto_id is not null
    and coalesce(new.cantidad, 0) > 0 then
    if v_new_type = 'SUCURSAL' and new.local_id is not null and v_has_branch_fn then
      perform operaciones.apply_inventory_delta(
        new.local_id,
        new.producto_id,
        -coalesce(new.cantidad, 0),
        'VENTA',
        new.id,
        'Salida por venta confirmada en sucursal'
      );
    elsif v_new_type = 'INDIVIDUAL' and new.almacen_id is not null and v_has_warehouse_fn then
      perform operaciones.apply_warehouse_inventory_delta(
        new.almacen_id,
        new.producto_id,
        -coalesce(new.cantidad, 0),
        'VENTA',
        new.id,
        'Salida por venta individual confirmada desde almacen'
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_inventory_from_sale on ventas.ventas;
create trigger trg_sync_inventory_from_sale
after insert or update of tipo_venta, local_id, almacen_id, producto_id, cantidad, estado
on ventas.ventas
for each row
execute function ventas.sync_inventory_from_sale();

commit;
