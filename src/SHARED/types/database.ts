/**
 * Tipos minimos de Supabase para los modulos que consume esta interfaz.
 * Puedes reemplazarlos por tipos generados automaticamente en el futuro.
 */
export interface Database {
  catalogo: {
    Tables: {
      productos: {
        Row: {
          id: string;
          codigo_barra: string | null;
          nombre: string;
          descripcion: string | null;
          precio_compra: number;
          precio_venta: number;
          activo: boolean;
          created_at: string;
          updated_at: string;
        };
      };
    };
  };
  operaciones: {
    Tables: {
      inventario: {
        Row: {
          id: string;
          producto_id: string;
          local_id: string;
          cantidad_actual: number;
          cantidad_minima: number;
          updated_at: string;
        };
      };
    };
  };
  ventas: {
    Tables: {
      ventas: {
        Row: {
          id: string;
          local_id: string;
          usuario_id: string;
          fecha: string;
          estado: 'BORRADOR' | 'CONFIRMADA' | 'ANULADA';
          subtotal: number;
          impuestos: number;
          descuento: number;
          total: number;
          moneda: string;
          numero_comprobante: string | null;
          observaciones: string | null;
          created_at: string;
          updated_at: string;
        };
      };
    };
  };
}
