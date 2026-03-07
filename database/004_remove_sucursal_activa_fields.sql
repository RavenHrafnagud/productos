-- -------------------------------------------------------------------------
-- Elimina columnas legacy relacionadas con "sucursal activa" si existen.
-- Script seguro: no falla si las columnas no estan creadas.
-- -------------------------------------------------------------------------
begin;

alter table if exists operaciones.locales
  drop column if exists sucursal_activa;

alter table if exists operaciones.locales
  drop column if exists sede_trabajo_actual;

commit;
