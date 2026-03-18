-- -------------------------------------------------------------------------
-- Extiende sucursales y agrega modulo de envios:
-- 1) operaciones.locales: rut, rut_pdf_url, porcentaje_comision.
-- 2) ventas.envios: trazabilidad logistica + calculos financieros.
-- 3) Bucket storage para PDF de RUT por sucursal.
-- 4) Politicas RLS y grants para roles del negocio.
-- -------------------------------------------------------------------------
begin;

create extension if not exists pgcrypto with schema extensions;

alter table if exists operaciones.locales
  add column if not exists rut text;

alter table if exists operaciones.locales
  add column if not exists rut_pdf_url text;

alter table if exists operaciones.locales
  add column if not exists porcentaje_comision numeric(5, 2) default 0;

update operaciones.locales
set porcentaje_comision = 0
where porcentaje_comision is null;

alter table if exists operaciones.locales
  alter column porcentaje_comision set default 0;

alter table if exists operaciones.locales
  alter column porcentaje_comision set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'locales_porcentaje_comision_chk'
      and conrelid = 'operaciones.locales'::regclass
  ) then
    alter table operaciones.locales
      add constraint locales_porcentaje_comision_chk
      check (porcentaje_comision >= 0 and porcentaje_comision <= 100);
  end if;
end $$;

create table if not exists ventas.envios (
  id uuid primary key default gen_random_uuid(),
  local_id uuid null references operaciones.locales(id) on update cascade on delete set null,
  usuario_id uuid not null references identidad.usuarios(id) on update cascade on delete restrict,
  producto_id uuid not null references catalogo.productos(id) on update cascade on delete restrict,
  destinatario text not null,
  tipo_destino text not null
    check (tipo_destino in ('TIENDA', 'CLIENTE', 'DISTRIBUIDOR', 'LOCAL')),
  canal_venta text not null default 'DIRECTO'
    check (canal_venta in ('TIENDA', 'DIRECTO')),
  cantidad numeric(14, 2) not null check (cantidad > 0),
  precio_unitario numeric(14, 2) not null check (precio_unitario >= 0),
  costo_envio numeric(14, 2) not null default 0 check (costo_envio >= 0),
  comision_porcentaje numeric(5, 2) not null default 0
    check (comision_porcentaje >= 0 and comision_porcentaje <= 100),
  estado_envio text not null default 'PENDIENTE'
    check (estado_envio in ('PENDIENTE', 'ENVIADO', 'ENTREGADO')),
  fecha_envio timestamptz not null default now(),
  observaciones text,
  ingreso_bruto numeric(14, 2) generated always as ((cantidad * precio_unitario)) stored,
  comision_valor numeric(14, 2) generated always as (((cantidad * precio_unitario) * (comision_porcentaje / 100))) stored,
  ganancia_neta numeric(14, 2) generated always as (((cantidad * precio_unitario) - ((cantidad * precio_unitario) * (comision_porcentaje / 100)) - costo_envio)) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists envios_fecha_envio_idx on ventas.envios (fecha_envio desc);
create index if not exists envios_producto_id_idx on ventas.envios (producto_id);
create index if not exists envios_local_id_idx on ventas.envios (local_id);

alter table if exists ventas.envios enable row level security;

do $$
declare
  policy_row record;
begin
  for policy_row in
    select policyname
    from pg_policies
    where schemaname = 'ventas'
      and tablename = 'envios'
  loop
    execute format('drop policy if exists %I on ventas.envios', policy_row.policyname);
  end loop;

  execute $q$
    create policy envios_roles_all on ventas.envios
    for all to authenticated
    using (
      auth.uid() is not null
      and public.has_role(auth.uid(), array['administrador','admin','gerente','usuario'])
    )
    with check (
      auth.uid() is not null
      and public.has_role(auth.uid(), array['administrador','admin','gerente','usuario'])
    )
  $q$;
end $$;

grant usage on schema ventas to authenticated;
grant select, insert, update, delete on ventas.envios to authenticated;

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
  if to_regclass('ventas.envios') is not null then
    execute 'delete from ventas.envios where local_id = $1' using p_branch_id;
  end if;

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

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'branch-rut-documents',
  'branch-rut-documents',
  true,
  8388608,
  array['application/pdf']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists branch_rut_read on storage.objects;
drop policy if exists branch_rut_insert on storage.objects;
drop policy if exists branch_rut_update on storage.objects;
drop policy if exists branch_rut_delete on storage.objects;

create policy branch_rut_read on storage.objects
for select to authenticated
using (bucket_id = 'branch-rut-documents');

create policy branch_rut_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'branch-rut-documents'
  and auth.uid() is not null
  and public.has_role(auth.uid(), array['administrador','admin','gerente'])
);

create policy branch_rut_update on storage.objects
for update to authenticated
using (
  bucket_id = 'branch-rut-documents'
  and auth.uid() is not null
  and public.has_role(auth.uid(), array['administrador','admin','gerente'])
)
with check (
  bucket_id = 'branch-rut-documents'
  and auth.uid() is not null
  and public.has_role(auth.uid(), array['administrador','admin','gerente'])
);

create policy branch_rut_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'branch-rut-documents'
  and auth.uid() is not null
  and public.has_role(auth.uid(), array['administrador','admin','gerente'])
);

commit;
