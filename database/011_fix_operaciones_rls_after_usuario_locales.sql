-- -------------------------------------------------------------------------
-- Repara RLS en operaciones tras eliminar operaciones.usuario_locales.
-- Objetivo: que usuarios admin autenticados puedan leer/escribir
-- operaciones.locales, operaciones.inventario y operaciones.movimientos_inventario.
-- -------------------------------------------------------------------------
begin;

create or replace function public.is_admin_user(p_uid uuid)
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
      and lower(r.nombre) = 'admin'
  );
$$;

grant execute on function public.is_admin_user(uuid) to authenticated;
grant usage on schema operaciones to authenticated;

do $$
declare
  table_name text;
  policy_row record;
  policy_name text;
begin
  foreach table_name in array array['locales', 'inventario', 'movimientos_inventario']
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
      execute format(
        'drop policy if exists %I on operaciones.%I',
        policy_row.policyname,
        table_name
      );
    end loop;

    policy_name := format('%s_admin_all', table_name);

    execute format(
      'create policy %I on operaciones.%I
       for all to authenticated
       using (auth.uid() is not null and public.is_admin_user(auth.uid()))
       with check (auth.uid() is not null and public.is_admin_user(auth.uid()))',
      policy_name,
      table_name
    );

    execute format(
      'grant select, insert, update, delete on operaciones.%I to authenticated',
      table_name
    );
  end loop;
end $$;

commit;
