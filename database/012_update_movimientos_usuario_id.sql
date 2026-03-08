-- -------------------------------------------------------------------------
-- Ajusta operaciones.movimientos_inventario:
-- 1) Reemplaza persona_id por usuarios_id.
-- 2) Migra datos existentes persona_id -> usuarios_id via identidad.usuarios.
-- 3) Crea FK a identidad.usuarios(id).
-- -------------------------------------------------------------------------
begin;

do $$
declare
  current_fk record;
begin
  if to_regclass('operaciones.movimientos_inventario') is null then
    return;
  end if;

  alter table operaciones.movimientos_inventario
    add column if not exists usuarios_id uuid;

  -- Migra datos historicos cuando exista persona_id en la tabla.
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'operaciones'
      and table_name = 'movimientos_inventario'
      and column_name = 'persona_id'
  ) then
    execute $q$
      update operaciones.movimientos_inventario mi
      set usuarios_id = u.id
      from identidad.usuarios u
      where mi.usuarios_id is null
        and mi.persona_id is not null
        and u.persona_id = mi.persona_id
    $q$;

    for current_fk in
      select c.conname
      from pg_constraint c
      join pg_class t on t.oid = c.conrelid
      join pg_namespace n on n.oid = t.relnamespace
      where c.contype = 'f'
        and n.nspname = 'operaciones'
        and t.relname = 'movimientos_inventario'
        and exists (
          select 1
          from unnest(c.conkey) as ck(attnum)
          join pg_attribute a
            on a.attrelid = t.oid
           and a.attnum = ck.attnum
          where a.attname = 'persona_id'
        )
    loop
      execute format(
        'alter table operaciones.movimientos_inventario drop constraint if exists %I',
        current_fk.conname
      );
    end loop;

    alter table operaciones.movimientos_inventario
      drop column if exists persona_id;
  end if;

  if not exists (
    select 1
    from pg_constraint c
    where c.conname = 'movimientos_inventario_usuarios_id_fkey'
      and c.conrelid = 'operaciones.movimientos_inventario'::regclass
  ) then
    alter table operaciones.movimientos_inventario
      add constraint movimientos_inventario_usuarios_id_fkey
      foreign key (usuarios_id) references identidad.usuarios(id)
      on update cascade
      on delete set null;
  end if;

  create index if not exists idx_movimientos_inventario_usuarios_id
    on operaciones.movimientos_inventario (usuarios_id);
end $$;

commit;
