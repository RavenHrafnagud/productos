/**
 * Tipado minimo de Supabase para operaciones del panel.
 * Mantener este contrato evita errores en runtime por campos mal nombrados.
 */
type TableShape<Row, Insert, Update = Insert> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
};

export interface Database {
  identidad: {
    Tables: {
      personas: TableShape<
        {
          id: string;
          nombres: string;
          apellidos: string;
          email: string | null;
          estado: boolean;
        },
        {
          id?: string;
          nombres: string;
          apellidos: string;
          email?: string | null;
          estado?: boolean;
        }
      >;
      roles: TableShape<
        {
          id: string;
          nombre: string;
          descripcion: string | null;
        },
        {
          id?: string;
          nombre: string;
          descripcion?: string | null;
        }
      >;
      usuarios: TableShape<
        {
          id: string;
          persona_id: string;
          rol_id: string | null;
          fecha_asignacion: string | null;
          estado: boolean;
        },
        {
          id: string;
          persona_id: string;
          rol_id?: string | null;
          fecha_asignacion?: string | null;
          estado?: boolean;
        }
      >;
    };
  };
  catalogo: {
    Tables: {
      productos: TableShape<
        {
          id: string;
          codigo_barra: string | null;
          nombre: string;
          descripcion: string | null;
          precio_venta: number;
          estado: boolean;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          codigo_barra?: string | null;
          nombre: string;
          descripcion?: string | null;
          precio_venta: number;
          estado?: boolean;
        }
      >;
    };
  };
  operaciones: {
    Tables: {
      locales: TableShape<
        {
          id: string;
          nit: string;
          rut: string | null;
          rut_pdf_url: string | null;
          porcentaje_comision: number;
          nombre: string;
          direccion: string | null;
          localidad: string | null;
          ciudad: string | null;
          pais: string;
          telefono: string | null;
          email: string | null;
          estado: boolean;
          created_at: string;
        },
        {
          id?: string;
          nit: string;
          rut?: string | null;
          rut_pdf_url?: string | null;
          porcentaje_comision?: number;
          nombre: string;
          direccion?: string | null;
          localidad?: string | null;
          ciudad?: string | null;
          pais?: string;
          telefono?: string | null;
          email?: string | null;
          estado?: boolean;
        }
      >;
      almacenes: TableShape<
        {
          id: string;
          nit: string | null;
          nombre: string;
          direccion: string | null;
          ciudad: string | null;
          pais: string;
          telefono: string | null;
          email: string | null;
          es_propio: boolean;
          costo_arriendo: number;
          moneda: string;
          estado: boolean;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          nit?: string | null;
          nombre: string;
          direccion?: string | null;
          ciudad?: string | null;
          pais?: string;
          telefono?: string | null;
          email?: string | null;
          es_propio?: boolean;
          costo_arriendo?: number;
          moneda?: string;
          estado?: boolean;
        }
      >;
      inventario: TableShape<
        {
          id: string;
          producto_id: string;
          local_id: string;
          cantidad_actual: number;
          cantidad_minima: number;
          updated_at: string;
        },
        {
          id?: string;
          producto_id: string;
          local_id: string;
          cantidad_actual: number;
          cantidad_minima: number;
          updated_at?: string;
        }
      >;
      inventario_almacen: TableShape<
        {
          id: string;
          almacen_id: string;
          producto_id: string;
          cantidad_actual: number;
          cantidad_minima: number;
          updated_at: string;
        },
        {
          id?: string;
          almacen_id: string;
          producto_id: string;
          cantidad_actual: number;
          cantidad_minima: number;
          updated_at?: string;
        }
      >;
      movimientos_inventario: TableShape<
        {
          id: number;
          producto_id: string;
          local_id: string;
          usuarios_id: string | null;
          tipo_movimiento: 'ENTRADA' | 'SALIDA' | 'AJUSTE';
          cantidad: number;
          fecha: string;
          motivo: string | null;
          origen_tipo: string;
          origen_id: string | null;
        },
        {
          producto_id: string;
          local_id: string;
          usuarios_id?: string | null;
          tipo_movimiento: 'ENTRADA' | 'SALIDA' | 'AJUSTE';
          cantidad: number;
          fecha?: string;
          motivo?: string | null;
          origen_tipo?: string;
          origen_id?: string | null;
        }
      >;
      movimientos_almacen: TableShape<
        {
          id: number;
          almacen_id: string;
          producto_id: string;
          usuarios_id: string | null;
          tipo_movimiento: 'ENTRADA' | 'SALIDA' | 'AJUSTE';
          cantidad: number;
          fecha: string;
          motivo: string | null;
          origen_tipo: string;
          origen_id: string | null;
        },
        {
          id?: number;
          almacen_id: string;
          producto_id: string;
          usuarios_id?: string | null;
          tipo_movimiento: 'ENTRADA' | 'SALIDA' | 'AJUSTE';
          cantidad: number;
          fecha?: string;
          motivo?: string | null;
          origen_tipo?: string;
          origen_id?: string | null;
        }
      >;
    };
  };
  ventas: {
    Tables: {
      ventas: TableShape<
        {
          id: string;
          local_id: string;
          producto_id: string | null;
          cantidad: number | null;
          precio_unitario: number | null;
          fecha: string;
          estado: 'BORRADOR' | 'CONFIRMADA' | 'ANULADA';
          total: number;
          moneda: string;
        },
        {
          id?: string;
          local_id: string;
          producto_id?: string | null;
          cantidad?: number | null;
          precio_unitario?: number | null;
          fecha?: string;
          estado?: 'BORRADOR' | 'CONFIRMADA' | 'ANULADA';
          total?: number;
          moneda?: string;
        }
      >;
      envios: TableShape<
        {
          id: string;
          almacen_id: string | null;
          local_id: string | null;
          usuario_id: string;
          producto_id: string;
          destinatario: string;
          tipo_destino: 'TIENDA' | 'CLIENTE' | 'DISTRIBUIDOR' | 'LOCAL';
          canal_venta: 'TIENDA' | 'DIRECTO';
          cantidad: number;
          precio_unitario: number;
          costo_envio: number;
          comision_porcentaje: number;
          estado_envio: 'PENDIENTE' | 'ENVIADO' | 'ENTREGADO';
          fecha_envio: string;
          observaciones: string | null;
          ingreso_bruto: number;
          comision_valor: number;
          ganancia_neta: number;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          almacen_id?: string | null;
          local_id?: string | null;
          usuario_id: string;
          producto_id: string;
          destinatario: string;
          tipo_destino: 'TIENDA' | 'CLIENTE' | 'DISTRIBUIDOR' | 'LOCAL';
          canal_venta?: 'TIENDA' | 'DIRECTO';
          cantidad: number;
          precio_unitario: number;
          costo_envio?: number;
          comision_porcentaje?: number;
          estado_envio?: 'PENDIENTE' | 'ENVIADO' | 'ENTREGADO';
          fecha_envio?: string;
          observaciones?: string | null;
        }
      >;
    };
  };
}
