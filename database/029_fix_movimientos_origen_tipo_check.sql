-- -------------------------------------------------------------------------
-- Corrige check constraint de operaciones.movimientos_inventario.origen_tipo
-- para soportar trazabilidad de ventas/envios.
--
-- Error que resuelve:
-- new row for relation "movimientos_inventario"
-- violates check constraint "movimientos_inventario_origen_tipo_check"
-- -------------------------------------------------------------------------
begin;

do $$
begin
  if to_regclass('operaciones.movimientos_inventario') is null then
    raise notice 'Tabla operaciones.movimientos_inventario no existe. Se omite ajuste.';
    return;
  end if;

  alter table operaciones.movimientos_inventario
    drop constraint if exists movimientos_inventario_origen_tipo_check;

  alter table operaciones.movimientos_inventario
    add constraint movimientos_inventario_origen_tipo_check
    check (
      origen_tipo = any (
        array[
          'VENTA'::text,
          'VENTA_REVERSA'::text,
          'COMPRA'::text,
          'ENVIO'::text,
          'ENVIO_REVERSA'::text,
          'AJUSTE'::text,
          'AJUSTE_MANUAL'::text,
          'MANUAL'::text,
          'DEVOLUCION'::text,
          'INICIAL'::text,
          'INICIAL_ALMACEN'::text,
          'TRASLADO'::text,
          'SISTEMA'::text
        ]
      )
    );
end $$;

commit;

