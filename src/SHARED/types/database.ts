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
        },
        {
          id?: string;
          nombres: string;
          apellidos: string;
          email?: string | null;
        }
      >;
      usuarios: TableShape<
        {
          id: string;
          persona_id: string;
          activo: boolean;
        },
        {
          id: string;
          persona_id: string;
          activo?: boolean;
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
          precio_compra: number;
          precio_venta: number;
          activo: boolean;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          codigo_barra?: string | null;
          nombre: string;
          descripcion?: string | null;
          precio_compra: number;
          precio_venta: number;
          activo?: boolean;
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
          nombre: string;
          direccion: string | null;
          localidad: string | null;
          ciudad: string | null;
          pais: string;
          telefono: string | null;
          email: string | null;
          activo: boolean;
          created_at: string;
        },
        {
          id?: string;
          nit: string;
          nombre: string;
          direccion?: string | null;
          localidad?: string | null;
          ciudad?: string | null;
          pais?: string;
          telefono?: string | null;
          email?: string | null;
          activo?: boolean;
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
      movimientos_inventario: TableShape<
        {
          id: number;
          producto_id: string;
          local_id: string;
          persona_id: string | null;
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
          persona_id?: string | null;
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
          fecha: string;
          estado: 'BORRADOR' | 'CONFIRMADA' | 'ANULADA';
          total: number;
          moneda: string;
        },
        {
          id?: string;
          local_id: string;
          fecha?: string;
          estado?: 'BORRADOR' | 'CONFIRMADA' | 'ANULADA';
          total?: number;
          moneda?: string;
        }
      >;
    };
  };
}
