-- -------------------------------------------------------------------------
-- Elimina operaciones.usuario_locales y dependencias directas.
-- 1) Quita FKs de tablas que referencien usuario_locales.
-- 2) Elimina la tabla usuario_locales.
-- -------------------------------------------------------------------------
begin;

do $$
declare
  fk record;
begin
  for fk in
    select
      c.conname as constraint_name,
      n_src.nspname as source_schema,
      t_src.relname as source_table
    from pg_constraint c
    join pg_class t_src on t_src.oid = c.conrelid
    join pg_namespace n_src on n_src.oid = t_src.relnamespace
    join pg_class t_ref on t_ref.oid = c.confrelid
    join pg_namespace n_ref on n_ref.oid = t_ref.relnamespace
    where c.contype = 'f'
      and n_ref.nspname = 'operaciones'
      and t_ref.relname = 'usuario_locales'
  loop
    execute format(
      'alter table %I.%I drop constraint if exists %I',
      fk.source_schema,
      fk.source_table,
      fk.constraint_name
    );
  end loop;
end $$;

drop table if exists operaciones.usuario_locales cascade;

commit;
