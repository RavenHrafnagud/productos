/**
 * Seccion de inventario por local.
 */
import { useInventory } from '../hooks/useInventory';
import { formatDateTime } from '../../SHARED/utils/format';
import { DataTable, TableWrap, Tag } from '../../SHARED/ui/DataTable';
import { SectionCard, SectionHeader, SectionMeta, SectionTitle } from '../../SHARED/ui/SectionCard';
import { StatusState } from '../../SHARED/ui/StatusState';

interface InventorySectionProps {
  localId: string;
  refreshKey: number;
}

export function InventorySection({ localId, refreshKey }: InventorySectionProps) {
  const { inventory, status, error } = useInventory(localId, refreshKey);

  return (
    <SectionCard>
      <SectionHeader>
        <SectionTitle>INVENTORY / Stock actual</SectionTitle>
        <SectionMeta>{localId ? `Local: ${localId}` : 'Sin local seleccionado'}</SectionMeta>
      </SectionHeader>

      {!localId && <StatusState kind="info" message="Define local_id para ver inventario." />}
      {localId && status === 'loading' && <StatusState kind="loading" message="Cargando inventario..." />}
      {localId && status === 'error' && <StatusState kind="error" message={error ?? 'Error inesperado.'} />}
      {localId && status === 'success' && inventory.length === 0 && (
        <StatusState kind="empty" message="No hay inventario registrado para este local." />
      )}

      {localId && status === 'success' && inventory.length > 0 && (
        <TableWrap>
          <DataTable>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Codigo</th>
                <th>Actual</th>
                <th>Minima</th>
                <th>Estado</th>
                <th>Actualizado</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((item) => {
                const lowStock = item.cantidadActual <= item.cantidadMinima;
                return (
                  <tr key={item.id}>
                    <td>{item.productoNombre}</td>
                    <td>{item.codigoBarra ?? 'Sin codigo'}</td>
                    <td>{item.cantidadActual}</td>
                    <td>{item.cantidadMinima}</td>
                    <td>
                      <Tag $tone={lowStock ? 'warn' : 'ok'}>
                        {lowStock ? 'Bajo' : 'Ok'}
                      </Tag>
                    </td>
                    <td>{formatDateTime(item.updatedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </DataTable>
        </TableWrap>
      )}
    </SectionCard>
  );
}
