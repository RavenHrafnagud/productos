-- -------------------------------------------------------------------------
-- Alinea validacion de admin con nombres de rol reales:
-- Roles soportados para privilegios administrativos:
-- - admin
-- - administrador
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
    join identidad.roles r on r.id = u.rol_id
    where u.id = p_uid
      and coalesce(u.estado, true) = true
      and lower(trim(r.nombre)) in ('admin', 'administrador')
  );
$$;

grant execute on function public.is_admin_user(uuid) to authenticated;

commit;
