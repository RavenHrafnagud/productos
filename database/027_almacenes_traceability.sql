-- -------------------------------------------------------------------------
-- Modulo de almacenes y trazabilidad completa de despachos:
-- 1) operaciones.almacenes (origen logistico).
-- 2) operaciones.inventario_almacen + operaciones.movimientos_almacen.
-- 3) ventas.envios incorpora almacen_id como origen obligatorio de stock.
-- 4) Trigger de envios: salida de almacen y entrada a sucursal destino.
-- 5) RLS/grants y helper de borrado en cascada para almacenes.
-- -------------------------------------------------------------------------
begin;

create extension if not exists pgcrypto with schema extensions;

create table if not exists operaciones.almacenes (
  id uuid primary key default gen_random_uuid(),
  nit text unique,
  nombre text not null,
  direccion text,
  ciudad text,
  pais text not null default 'CO',
  telefono text,
  email text,
  es_propio boolean not null default true,
  costo_arriendo numeric(14, 2) not null default 0 check (costo_arriendo >= 0),
  moneda char(3) not null default 'COP',
  estado boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

update operaciones.almacenes
set costo_arriendo = 0
where es_propio = true
  and coalesce(costo_arriendo, 0) <> 0;

create table if not exists operaciones.inventario_almacen (
  id uuid primary key default gen_random_uuid(),
  almacen_id uuid not null references operaciones.almacenes(id) on update cascade on delete cascade,
  producto_id uuid not null references catalogo.productos(id) on update cascade on delete restrict,
  cantidad_actual numeric(14, 2) not null default 0 check (cantidad_actual >= 0),
  cantidad_minima numeric(14, 2) not null default 0 check (cantidad_minima >= 0),
  updated_at timestamptz not null default now(),
  unique (almacen_id, producto_id)
);

create table if not exists operaciones.movimientos_almacen (
  id bigint generated always as identity primary key,
  almacen_id uuid not null references operaciones.almacenes(id) on update cascade on delete cascade,
  producto_id uuid not null references catalogo.productos(id) on update cascade on delete restrict,
  usuarios_id uuid references identidad.usuarios(id) on update cascade on delete set null,
  tipo_movimiento text not null check (tipo_movimiento in ('ENTRADA', 'SALIDA', 'AJUSTE')),
  cantidad numeric(14, 2) not null check (cantidad > 0),
  fecha timestamptz not null default now(),
  motivo text,
  origen_tipo text not null default 'MANUAL'
    check (
      origen_tipo in (
        'VENTA',
        'VENTA_REVERSA',
        'ENVIO',
        'ENVIO_REVERSA',
        'AJUSTE',
        'AJUSTE_MANUAL',
        'MANUAL',
        'DEVOLUCION',
        'INICIAL',
        'INICIAL_ALMACEN',
        'TRASLADO'
      )
    ),
  origen_id uuid
);

create index if not exists almacenes_created_idx on operaciones.almacenes (created_at desc);
create index if not exists inventario_almacen_almacen_idx on operaciones.inventario_almacen (almacen_id);
create index if not exists inventario_almacen_producto_idx on operaciones.inventario_almacen (producto_id);
create index if not exists movimientos_almacen_fecha_idx on operaciones.movimientos_almacen (fecha desc);
create index if not exists movimientos_almacen_almacen_idx on operaciones.movimientos_almacen (almacen_id);
create index if not exists movimientos_almacen_producto_idx on operaciones.movimientos_almacen (producto_id);

alter table if exists ventas.envios
  add column if not exists almacen_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'envios_almacen_id_fkey'
      and conrelid = 'ventas.envios'::regclass
  ) then
    alter table ventas.envios
      add constraint envios_almacen_id_fkey
      foreign key (almacen_id) references operaciones.almacenes(id)
      on update cascade on delete set null;
  end if;
end $$;

create or replace function operaciones.apply_warehouse_inventory_delta(
  p_almacen_id uuid,
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
  if p_almacen_id is null or p_producto_id is null then
    return;
  end if;

  if coalesce(p_delta, 0) = 0 then
    return;
  end if;

  if not exists (
    select 1
    from operaciones.inventario_almacen ia
    where ia.almacen_id = p_almacen_id
      and ia.producto_id = p_producto_id
  ) then
    insert into operaciones.inventario_almacen (
      id,
      almacen_id,
      producto_id,
      cantidad_actual,
      cantidad_minima,
      updated_at
    )
    values (
      gen_random_uuid(),
      p_almacen_id,
      p_producto_id,
      0,
      0,
      now()
    );
  end if;

  select ia.id, coalesce(ia.cantidad_actual, 0)
  into v_inventory_id, v_current_qty
  from operaciones.inventario_almacen ia
  where ia.almacen_id = p_almacen_id
    and ia.producto_id = p_producto_id
  limit 1
  for update;

  if v_inventory_id is null then
    raise exception 'No se pudo resolver inventario del almacen para el producto.';
  end if;

  v_new_qty := coalesce(v_current_qty, 0) + p_delta;
  if v_new_qty < 0 then
    raise exception 'Stock insuficiente en almacen para completar la operacion.';
  end if;

  update operaciones.inventario_almacen
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

  insert into operaciones.movimientos_almacen (
    almacen_id,
    producto_id,
    usuarios_id,
    tipo_movimiento,
    cantidad,
    fecha,
    motivo,
    origen_tipo,
    origen_id
  )
  values (
    p_almacen_id,
    p_producto_id,
    v_actor_id,
    case when p_delta > 0 then 'ENTRADA' else 'SALIDA' end,
    abs(p_delta),
    now(),
    coalesce(nullif(trim(p_motivo), ''), 'Trazabilidad automatica de almacen'),
    coalesce(nullif(trim(p_origen_tipo), ''), 'SISTEMA'),
    p_origen_id
  );
end;
$$;

grant execute on function operaciones.apply_warehouse_inventory_delta(uuid, uuid, numeric, text, uuid, text) to authenticated;

create or replace function ventas.sync_inventory_from_envio()
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
    if coalesce(old.almacen_id::text, '') = coalesce(new.almacen_id::text, '')
      and coalesce(old.local_id::text, '') = coalesce(new.local_id::text, '')
      and coalesce(old.producto_id::text, '') = coalesce(new.producto_id::text, '')
      and coalesce(old.cantidad, 0) = coalesce(new.cantidad, 0)
      and coalesce(old.estado_envio, '') = coalesce(new.estado_envio, '')
      and coalesce(old.canal_venta, '') = coalesce(new.canal_venta, '') then
      return new;
    end if;
  end if;

  if upper(coalesce(new.estado_envio, '')) = 'ENTREGADO' and new.almacen_id is null then
    raise exception 'Debes indicar almacen_id para envios entregados.';
  end if;

  if upper(coalesce(new.estado_envio, '')) = 'ENTREGADO'
    and upper(coalesce(new.canal_venta, 'DIRECTO')) = 'TIENDA'
    and new.local_id is null then
    raise exception 'Debes indicar local_id para envios de canal TIENDA entregados.';
  end if;

  if tg_op = 'UPDATE' then
    v_old_applied :=
      old.almacen_id is not null
      and old.producto_id is not null
      and coalesce(old.cantidad, 0) > 0
      and upper(coalesce(old.estado_envio, '')) = 'ENTREGADO';

    if v_old_applied then
      perform operaciones.apply_warehouse_inventory_delta(
        old.almacen_id,
        old.producto_id,
        coalesce(old.cantidad, 0),
        'ENVIO_REVERSA',
        old.id,
        'Reversion de salida en almacen por ajuste de envio'
      );

      if upper(coalesce(old.canal_venta, 'DIRECTO')) = 'TIENDA'
        and old.local_id is not null
        and to_regprocedure('operaciones.apply_inventory_delta(uuid,uuid,numeric,text,uuid,text)') is not null then
        perform operaciones.apply_inventory_delta(
          old.local_id,
          old.producto_id,
          -coalesce(old.cantidad, 0),
          'ENVIO_REVERSA',
          old.id,
          'Reversion de entrada en sucursal por ajuste de envio'
        );
      end if;
    end if;
  end if;

  v_new_applied :=
    new.almacen_id is not null
    and new.producto_id is not null
    and coalesce(new.cantidad, 0) > 0
    and upper(coalesce(new.estado_envio, '')) = 'ENTREGADO';

  if v_new_applied then
    perform operaciones.apply_warehouse_inventory_delta(
      new.almacen_id,
      new.producto_id,
      -coalesce(new.cantidad, 0),
      'ENVIO',
      new.id,
      'Salida desde almacen por envio entregado'
    );

    if upper(coalesce(new.canal_venta, 'DIRECTO')) = 'TIENDA'
      and new.local_id is not null
      and to_regprocedure('operaciones.apply_inventory_delta(uuid,uuid,numeric,text,uuid,text)') is not null then
      perform operaciones.apply_inventory_delta(
        new.local_id,
        new.producto_id,
        coalesce(new.cantidad, 0),
        'ENVIO',
        new.id,
        'Entrada en sucursal por envio entregado desde almacen'
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_inventory_from_envio on ventas.envios;
create trigger trg_sync_inventory_from_envio
after insert or update of almacen_id, local_id, producto_id, cantidad, estado_envio, canal_venta
on ventas.envios
for each row
execute function ventas.sync_inventory_from_envio();

alter table if exists operaciones.almacenes enable row level security;
alter table if exists operaciones.inventario_almacen enable row level security;
alter table if exists operaciones.movimientos_almacen enable row level security;

do $$
declare
  policy_row record;
begin
  for policy_row in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'operaciones'
      and tablename in ('almacenes', 'inventario_almacen', 'movimientos_almacen')
  loop
    execute format(
      'drop policy if exists %I on %I.%I',
      policy_row.policyname,
      policy_row.schemaname,
      policy_row.tablename
    );
  end loop;

  create policy almacenes_admin_manager_all on operaciones.almacenes
  for all to authenticated
  using (
    auth.uid() is not null
    and public.has_role(auth.uid(), array['administrador','admin','gerente'])
  )
  with check (
    auth.uid() is not null
    and public.has_role(auth.uid(), array['administrador','admin','gerente'])
  );

  create policy almacenes_user_read on operaciones.almacenes
  for select to authenticated
  using (
    auth.uid() is not null
    and public.has_role(auth.uid(), array['usuario'])
  );

  create policy inventario_almacen_admin_manager_all on operaciones.inventario_almacen
  for all to authenticated
  using (
    auth.uid() is not null
    and public.has_role(auth.uid(), array['administrador','admin','gerente'])
  )
  with check (
    auth.uid() is not null
    and public.has_role(auth.uid(), array['administrador','admin','gerente'])
  );

  create policy movimientos_almacen_admin_manager_all on operaciones.movimientos_almacen
  for all to authenticated
  using (
    auth.uid() is not null
    and public.has_role(auth.uid(), array['administrador','admin','gerente'])
  )
  with check (
    auth.uid() is not null
    and public.has_role(auth.uid(), array['administrador','admin','gerente'])
  );
end $$;

grant usage on schema operaciones to authenticated;
grant select, insert, update, delete on operaciones.almacenes to authenticated;
grant select, insert, update, delete on operaciones.inventario_almacen to authenticated;
grant select, insert, update, delete on operaciones.movimientos_almacen to authenticated;

create or replace function public.delete_warehouse_cascade(p_warehouse_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth, identidad, catalogo, operaciones, ventas
as $$
begin
  if auth.uid() is null or not public.has_role(auth.uid(), array['administrador','admin','gerente']) then
    raise exception 'No autorizado para eliminar almacenes.';
  end if;

  if p_warehouse_id is null then
    raise exception 'Debes indicar el almacen a eliminar.';
  end if;

  if to_regclass('ventas.envios') is not null then
    execute 'delete from ventas.envios where almacen_id = $1' using p_warehouse_id;
  end if;

  if to_regclass('operaciones.movimientos_almacen') is not null then
    execute 'delete from operaciones.movimientos_almacen where almacen_id = $1' using p_warehouse_id;
  end if;

  if to_regclass('operaciones.inventario_almacen') is not null then
    execute 'delete from operaciones.inventario_almacen where almacen_id = $1' using p_warehouse_id;
  end if;

  execute 'delete from operaciones.almacenes where id = $1' using p_warehouse_id;
end;
$$;

grant execute on function public.delete_warehouse_cascade(uuid) to authenticated;

create or replace function public.delete_product_cascade(p_product_id uuid)
returns void
language plpgsql
security definer
set search_path = public, catalogo, operaciones, ventas
as $$
begin
  if to_regclass('ventas.envios') is not null then
    execute 'delete from ventas.envios where producto_id = $1' using p_product_id;
  end if;

  if to_regclass('ventas.ventas') is not null then
    execute 'delete from ventas.ventas where producto_id = $1' using p_product_id;
  end if;

  if to_regclass('operaciones.movimientos_almacen') is not null then
    execute 'delete from operaciones.movimientos_almacen where producto_id = $1' using p_product_id;
  end if;

  if to_regclass('operaciones.inventario_almacen') is not null then
    execute 'delete from operaciones.inventario_almacen where producto_id = $1' using p_product_id;
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

grant execute on function public.delete_product_cascade(uuid) to authenticated;

commit;
