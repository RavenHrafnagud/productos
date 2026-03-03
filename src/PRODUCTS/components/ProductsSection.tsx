/**
 * Seccion de productos.
 * Renderiza listado de catalogo con estado de actividad.
 */
import { useProducts } from '../hooks/useProducts';
import { formatDateTime, formatMoney } from '../../SHARED/utils/format';
import { DataTable, TableWrap, Tag } from '../../SHARED/ui/DataTable';
import { SectionCard, SectionHeader, SectionMeta, SectionTitle } from '../../SHARED/ui/SectionCard';
import { StatusState } from '../../SHARED/ui/StatusState';

interface ProductsSectionProps {
  refreshKey: number;
}

export function ProductsSection({ refreshKey }: ProductsSectionProps) {
  const { products, status, error } = useProducts(refreshKey);

  return (
    <SectionCard>
      <SectionHeader>
        <SectionTitle>PRODUCTS / Catalogo</SectionTitle>
        <SectionMeta>{products.length} registros</SectionMeta>
      </SectionHeader>

      {status === 'loading' && <StatusState kind="loading" message="Cargando productos..." />}
      {status === 'error' && <StatusState kind="error" message={error ?? 'Error inesperado.'} />}
      {status === 'success' && products.length === 0 && (
        <StatusState kind="empty" message="No hay productos para mostrar." />
      )}

      {status === 'success' && products.length > 0 && (
        <TableWrap>
          <DataTable>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Codigo</th>
                <th>Compra</th>
                <th>Venta</th>
                <th>Estado</th>
                <th>Actualizado</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td>{product.nombre}</td>
                  <td>{product.codigoBarra ?? 'Sin codigo'}</td>
                  <td>{formatMoney(product.precioCompra)}</td>
                  <td>{formatMoney(product.precioVenta)}</td>
                  <td>
                    <Tag $tone={product.activo ? 'ok' : 'off'}>
                      {product.activo ? 'Activo' : 'Inactivo'}
                    </Tag>
                  </td>
                  <td>{formatDateTime(product.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </TableWrap>
      )}
    </SectionCard>
  );
}
