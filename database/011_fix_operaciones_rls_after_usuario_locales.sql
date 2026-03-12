-- -------------------------------------------------------------------------
-- Repara RLS en operaciones tras eliminar operaciones.usuario_locales.
-- Politica alineada con roles (Administrador/Gerente/Usuario).
-- -------------------------------------------------------------------------
begin;

create or replace function public.has_role(p_uid uuid, p_roles text[])
returns boolean
language sql
security definer
stable
set search_path = public, identidad
as $$
  select exists (
    select 1
    from identidad.usuarios u
    join identidad.roles r
      on r.id = u.rol_id
    where u.id = p_uid
      and coalesce(u.estado, true) = true
      and exists (
        select 1
        from unnest(p_roles) as role_name
        where lower(trim(r.nombre)) = lower(trim(role_name))
      )
  );
$$;

create or replace function public.is_admin_user(p_uid uuid)
returns boolean
language sql
security definer
stable
set search_path = public, identidad
as $$
  select public.has_role(p_uid, array['admin', 'administrador']);
$$;

grant execute on function public.has_role(uuid, text[]) to authenticated;
grant execute on function public.is_admin_user(uuid) to authenticated;
grant usage on schema operaciones to authenticated;

-- Operaciones.locales: admin/gerente full + usuario lectura.
do $$
declare
  policy_row record;
begin
  if to_regclass('operaciones.locales') is not null then
    execute 'alter table operaciones.locales enable row level security';

    for policy_row in
      select policyname
      from pg_policies
      where schemaname = 'operaciones'
        and tablename = 'locales'
    loop
      execute format('drop policy if exists %I on operaciones.locales', policy_row.policyname);
    end loop;

    execute $q$
      create policy locales_admin_manager_all on operaciones.locales
      for all to authenticated
      using (auth.uid() is not null and public.has_role(auth.uid(), array['administrador','admin','gerente']))
      with check (auth.uid() is not null and public.has_role(auth.uid(), array['administrador','admin','gerente']))
    $q$;

    execute $q$
      create policy locales_sales_read on operaciones.locales
      for select to authenticated
      using (auth.uid() is not null and public.has_role(auth.uid(), array['usuario']))
    $q$;

    grant select, insert, update, delete on operaciones.locales to authenticated;
  end if;
end $$;

-- Operaciones.inventario y movimientos_inventario: solo admin/gerente.
do $$
declare
  table_name text;
  policy_row record;
begin
  foreach table_name in array array['inventario', 'movimientos_inventario']
  loop
    if to_regclass(format('operaciones.%s', table_name)) is null then
      continue;
    end if;

    execute format('alter table operaciones.%I enable row level security', table_name);

    for policy_row in
      select policyname
      from pg_policies
      where schemaname = 'operaciones'
        and tablename = table_name
    loop
      execute format('drop policy if exists %I on operaciones.%I', policy_row.policyname, table_name);
    end loop;

    execute format(
      'create policy %I on operaciones.%I
       for all to authenticated
       using (auth.uid() is not null and public.has_role(auth.uid(), array[''administrador'',''admin'',''gerente'']))
       with check (auth.uid() is not null and public.has_role(auth.uid(), array[''administrador'',''admin'',''gerente'']))',
      format('%s_admin_manager_all', table_name),
      table_name
    );

    execute format('grant select, insert, update, delete on operaciones.%I to authenticated', table_name);
  end loop;
end $$;

commit;
