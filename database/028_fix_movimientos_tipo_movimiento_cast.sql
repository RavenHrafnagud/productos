-- -------------------------------------------------------------------------
-- Corrige casteo enum en operaciones.apply_inventory_delta
-- Evita error:
-- column "tipo_movimiento" is of type tipo_movimiento but expression is of type text
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
    (case when p_delta > 0 then 'ENTRADA' else 'SALIDA' end)::tipo_movimiento,
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

commit;

