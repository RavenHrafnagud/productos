-- -------------------------------------------------------------------------
-- Repara instance_id en auth.users y garantiza identities email.
-- Ejecutar con rol postgres en Supabase SQL Editor.
-- -------------------------------------------------------------------------
begin;

create extension if not exists pgcrypto with schema extensions;

-- 1) Asegura una instancia valida.
do $$
declare
  v_instance_id uuid;
begin
  select i.id
  into v_instance_id
  from auth.instances i
  order by i.created_at asc
  limit 1;

  if v_instance_id is null then
    insert into auth.instances (id, uuid, raw_base_config, created_at, updated_at)
    values (gen_random_uuid(), gen_random_uuid(), '{}'::text, now(), now())
    returning id into v_instance_id;
  end if;

  -- 2) Repara instance_id en usuarios.
  update auth.users
  set instance_id = v_instance_id
  where instance_id is null
     or instance_id = '00000000-0000-0000-0000-000000000000'
     or instance_id not in (select id from auth.instances);

  -- 3) Asegura identidad email para usuarios existentes.
  insert into auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  )
  select
    gen_random_uuid(),
    u.id,
    jsonb_build_object('sub', u.id::text, 'email', u.email),
    'email',
    u.id::text,
    now(),
    now(),
    now()
  from auth.users u
  where u.email is not null
    and not exists (
      select 1
      from auth.identities i
      where i.user_id = u.id and i.provider = 'email'
    );
end $$;

commit;
