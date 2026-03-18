-- -------------------------------------------------------------------------
-- Trazabilidad automatica de inventario para ventas y envios.
-- 1) Ventas confirmadas descuentan stock y registran movimiento.
-- 2) Envios entregados ajustan stock segun canal:
--    - TIENDA  => ENTRADA en sucursal destino.
--    - DIRECTO => SALIDA desde sucursal origen (si aplica local_id).
-- 3) Actualizaciones/reversiones mantienen coherencia de stock.
-- -------------------------------------------------------------------------
begin;

create or replace function operaciones.apply_inventory_delta(
  p_local_id uuid,
  p_producto_id uuid,
  p_delta numeric,
  p_origen_tipo text,
  p_origen_id uuid,
  p_motivo text default null
)
returns void
language plpgsql
security definer
set search_path = public, auth, identidad, operaciones, ventas
as $$
declare
  v_inventory_id uuid;
  v_current_qty numeric;
  v_new_qty numeric;
  v_actor_id uuid;
begin
  if p_local_id is null or p_producto_id is null then
    return;
  end if;

  if coalesce(p_delta, 0) = 0 then
    return;
  end if;

  if not exists (
    select 1
    from operaciones.inventario i
    where i.local_id = p_local_id
      and i.producto_id = p_producto_id
  ) then
    insert into operaciones.inventario (
      id,
      producto_id,
      local_id,
      cantidad_actual,
      cantidad_minima,
      updated_at
    )
    values (
      gen_random_uuid(),
      p_producto_id,
      p_local_id,
      0,
      0,
      now()
    );
  end if;

  select i.id, coalesce(i.cantidad_actual, 0)
  into v_inventory_id, v_current_qty
  from operaciones.inventario i
  where i.local_id = p_local_id
    and i.producto_id = p_producto_id
  order by i.updated_at desc nulls last, i.id
  limit 1
  for update;

  if v_inventory_id is null then
    raise exception 'No se pudo resolver el inventario para la sucursal/producto.';
  end if;

  v_new_qty := coalesce(v_current_qty, 0) + p_delta;
  if v_new_qty < 0 then
    raise exception 'Stock insuficiente para completar la operacion.';
  end if;

  update operaciones.inventario
  set
    cantidad_actual = v_new_qty,
    updated_at = now()
  where id = v_inventory_id;

  begin
    v_actor_id := auth.uid();
  exception
    when others then
      v_actor_id := null;
  end;

  insert into operaciones.movimientos_inventario (
    producto_id,
    local_id,
    tipo_movimiento,
    cantidad,
    fecha,
    motivo,
    origen_tipo,
    origen_id,
    usuarios_id
  )
  values (
    p_producto_id,
    p_local_id,
    case when p_delta > 0 then 'ENTRADA' else 'SALIDA' end,
    abs(p_delta),
    now(),
    coalesce(nullif(trim(p_motivo), ''), 'Trazabilidad automatica'),
    coalesce(nullif(trim(p_origen_tipo), ''), 'SISTEMA'),
    p_origen_id,
    v_actor_id
  );
end;
$$;

grant execute on function operaciones.apply_inventory_delta(uuid, uuid, numeric, text, uuid, text) to authenticated;

create or replace function ventas.sync_inventory_from_sale()
returns trigger
language plpgsql
security definer
set search_path = public, auth, identidad, operaciones, ventas
as $$
declare
  v_old_applied boolean := false;
  v_new_applied boolean := false;
begin
  if tg_op = 'UPDATE' then
    if coalesce(old.local_id::text, '') = coalesce(new.local_id::text, '')
      and coalesce(old.producto_id::text, '') = coalesce(new.producto_id::text, '')
      and coalesce(old.cantidad, 0) = coalesce(new.cantidad, 0)
      and coalesce(old.estado::text, '') = coalesce(new.estado::text, '') then
      return new;
    end if;
  end if;

  if tg_op = 'UPDATE' then
    v_old_applied :=
      old.local_id is not null
      and old.producto_id is not null
      and coalesce(old.cantidad, 0) > 0
      and upper(coalesce(old.estado::text, '')) = 'CONFIRMADA';

    if v_old_applied then
      perform operaciones.apply_inventory_delta(
        old.local_id,
        old.producto_id,
        coalesce(old.cantidad, 0),
        'VENTA_REVERSA',
        old.id,
        'Reversion por ajuste/anulacion de venta'
      );
    end if;
  end if;

  v_new_applied :=
    new.local_id is not null
    and new.producto_id is not null
    and coalesce(new.cantidad, 0) > 0
    and upper(coalesce(new.estado::text, '')) = 'CONFIRMADA';

  if v_new_applied then
    perform operaciones.apply_inventory_delta(
      new.local_id,
      new.producto_id,
      -coalesce(new.cantidad, 0),
      'VENTA',
      new.id,
      'Salida por venta confirmada'
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_inventory_from_sale on ventas.ventas;
create trigger trg_sync_inventory_from_sale
after insert or update of local_id, producto_id, cantidad, estado
on ventas.ventas
for each row
execute function ventas.sync_inventory_from_sale();

create or replace function ventas.sync_inventory_from_envio()
returns trigger
language plpgsql
security definer
set search_path = public, auth, identidad, operaciones, ventas
as $$
declare
  v_old_effect numeric := 0;
  v_new_effect numeric := 0;
begin
  if tg_op = 'UPDATE' then
    if coalesce(old.local_id::text, '') = coalesce(new.local_id::text, '')
      and coalesce(old.producto_id::text, '') = coalesce(new.producto_id::text, '')
      and coalesce(old.cantidad, 0) = coalesce(new.cantidad, 0)
      and coalesce(old.estado_envio, '') = coalesce(new.estado_envio, '')
      and coalesce(old.canal_venta, '') = coalesce(new.canal_venta, '') then
      return new;
    end if;
  end if;

  if old.local_id is not null
    and old.producto_id is not null
    and coalesce(old.cantidad, 0) > 0
    and upper(coalesce(old.estado_envio, '')) = 'ENTREGADO' then
    if upper(coalesce(old.canal_venta, 'DIRECTO')) = 'TIENDA' then
      v_old_effect := coalesce(old.cantidad, 0);
    else
      v_old_effect := -coalesce(old.cantidad, 0);
    end if;
  end if;

  if new.local_id is not null
    and new.producto_id is not null
    and coalesce(new.cantidad, 0) > 0
    and upper(coalesce(new.estado_envio, '')) = 'ENTREGADO' then
    if upper(coalesce(new.canal_venta, 'DIRECTO')) = 'TIENDA' then
      v_new_effect := coalesce(new.cantidad, 0);
    else
      v_new_effect := -coalesce(new.cantidad, 0);
    end if;
  end if;

  if tg_op = 'UPDATE' and v_old_effect <> 0 then
    perform operaciones.apply_inventory_delta(
      old.local_id,
      old.producto_id,
      -v_old_effect,
      'ENVIO_REVERSA',
      old.id,
      'Reversion por ajuste de envio'
    );
  end if;

  if v_new_effect <> 0 then
    perform operaciones.apply_inventory_delta(
      new.local_id,
      new.producto_id,
      v_new_effect,
      'ENVIO',
      new.id,
      case
        when upper(coalesce(new.canal_venta, 'DIRECTO')) = 'TIENDA'
          then 'Entrada por envio entregado a sucursal'
        else 'Salida por envio directo entregado'
      end
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_inventory_from_envio on ventas.envios;
create trigger trg_sync_inventory_from_envio
after insert or update of local_id, producto_id, cantidad, estado_envio, canal_venta
on ventas.envios
for each row
execute function ventas.sync_inventory_from_envio();

commit;

