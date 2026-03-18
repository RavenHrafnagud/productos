-- -------------------------------------------------------------------------
-- Vista financiera consolidada para analitica del negocio.
-- Une ventas.ventas + ventas.envios con comisiones/costos/ganancia neta.
-- -------------------------------------------------------------------------
begin;

create or replace view ventas.vw_operacion_financiera as
with ventas_base as (
  select
    v.id as operacion_id,
    'VENTA'::text as origen,
    v.fecha as fecha_operacion,
    'TIENDA'::text as canal_venta,
    v.local_id,
    v.producto_id,
    coalesce(v.cantidad, 0::numeric)::numeric(14, 2) as unidades,
    coalesce(v.total, 0::numeric)::numeric(14, 2) as ingreso_bruto,
    coalesce(l.porcentaje_comision, 0::numeric)::numeric(5, 2) as comision_porcentaje,
    (coalesce(v.total, 0::numeric) * (coalesce(l.porcentaje_comision, 0::numeric) / 100::numeric))::numeric(14, 2) as comision_valor,
    0::numeric(14, 2) as costo_envio,
    (
      coalesce(v.total, 0::numeric) -
      (coalesce(v.total, 0::numeric) * (coalesce(l.porcentaje_comision, 0::numeric) / 100::numeric))
    )::numeric(14, 2) as ganancia_neta
  from ventas.ventas v
  left join operaciones.locales l on l.id = v.local_id
),
envios_base as (
  select
    e.id as operacion_id,
    'ENVIO'::text as origen,
    e.fecha_envio as fecha_operacion,
    e.canal_venta,
    e.local_id,
    e.producto_id,
    e.cantidad::numeric(14, 2) as unidades,
    e.ingreso_bruto::numeric(14, 2) as ingreso_bruto,
    e.comision_porcentaje::numeric(5, 2) as comision_porcentaje,
    e.comision_valor::numeric(14, 2) as comision_valor,
    e.costo_envio::numeric(14, 2) as costo_envio,
    e.ganancia_neta::numeric(14, 2) as ganancia_neta
  from ventas.envios e
)
select * from ventas_base
union all
select * from envios_base;

grant select on ventas.vw_operacion_financiera to authenticated;

commit;

