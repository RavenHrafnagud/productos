/**
 * Seccion de productos.
 * Permite registrar articulos y consultar el catalogo.
 */
import { FormEvent, useMemo, useState } from 'react';
import styled from 'styled-components';
import { useProducts } from '../hooks/useProducts';
import { formatDateTime, formatMoney } from '../../SHARED/utils/format';
import { isSetupError, toFriendlySupabaseMessage } from '../../SHARED/utils/supabaseGuidance';
import { sanitizeText, toPositiveNumber } from '../../SHARED/utils/validators';
import { DataTable, TableWrap, Tag } from '../../SHARED/ui/DataTable';
import {
  ButtonsRow,
  DangerButton,
  Divider,
  Field,
  Fields,
  FormGrid,
  GhostButton,
  InputControl,
  PrimaryButton,
  SelectControl,
  TextAreaControl,
} from '../../SHARED/ui/FormControls';
import { SectionCard, SectionHeader, SectionMeta, SectionTitle } from '../../SHARED/ui/SectionCard';
import { StatusState } from '../../SHARED/ui/StatusState';

interface ProductsSectionProps {
  refreshKey: number;
  onProductCreated?: () => void;
}

interface ProductForm {
  nombre: string;
  codigoBarra: string;
  descripcion: string;
  precioVenta: string;
  estado: boolean;
}

const EMPTY_FORM: ProductForm = {
  nombre: '',
  codigoBarra: '',
  descripcion: '',
  precioVenta: '',
  estado: true,
};

const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 10px;
  margin-bottom: 12px;
`;

const SummaryCard = styled.article`
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-sm);
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 10px 18px rgba(12, 26, 20, 0.06);

  p {
    margin: 0;
    font-size: 0.78rem;
    color: var(--text-muted);
  }

  strong {
    display: block;
    margin-top: 4px;
    font-size: 1.05rem;
  }
`;

const TableActions = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  justify-content: flex-end;
`;

export function ProductsSection({ refreshKey, onProductCreated }: ProductsSectionProps) {
  const {
    products,
    status,
    error,
    createStatus,
    createError,
    updateStatus,
    updateError,
    deleteStatus,
    deleteError,
    addProduct,
    editProduct,
    removeProduct,
    reload,
  } = useProducts(refreshKey);
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const friendlyLoadError = toFriendlySupabaseMessage(error, 'productos');
  const friendlyCreateError = toFriendlySupabaseMessage(createError, 'productos');
  const friendlyUpdateError = toFriendlySupabaseMessage(updateError, 'productos');
  const friendlyDeleteError = toFriendlySupabaseMessage(deleteError, 'productos');
  const isSubmitting = createStatus === 'submitting' || updateStatus === 'submitting';
  const summary = useMemo(() => {
    const total = products.length;
    const active = products.filter((product) => product.estado).length;
    const inactive = total - active;
    const withBarcode = products.filter((product) => Boolean(product.codigoBarra)).length;
    return { total, active, inactive, withBarcode };
  }, [products]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const precioVenta = toPositiveNumber(form.precioVenta);
    const nombre = sanitizeText(form.nombre, 120);

    if (!nombre) {
      setFormError('El nombre del producto es obligatorio.');
      return;
    }

    if (precioVenta === null) {
      setFormError('El precio de venta debe ser numerico y mayor o igual a cero.');
      return;
    }

    try {
      const payload = {
        nombre,
        codigoBarra: sanitizeText(form.codigoBarra, 50),
        descripcion: sanitizeText(form.descripcion, 300),
        precioVenta,
        estado: form.estado,
      };

      if (editingProductId) {
        await editProduct(editingProductId, payload);
        setEditingProductId(null);
      } else {
        await addProduct(payload);
      }
      setForm(EMPTY_FORM);
      onProductCreated?.();
    } catch {
      // El detalle de error se refleja en createError/updateError.
    }
  };

  const handleStartEditProduct = (productId: string) => {
    const product = products.find((item) => item.id === productId);
    if (!product) return;

    setEditingProductId(product.id);
    setFormError(null);
    setForm({
      nombre: product.nombre,
      codigoBarra: product.codigoBarra ?? '',
      descripcion: product.descripcion ?? '',
      precioVenta: String(product.precioVenta),
      estado: product.estado,
    });
  };

  const handleCancelEdit = () => {
    setEditingProductId(null);
    setFormError(null);
    setForm(EMPTY_FORM);
  };

  const handleDeleteProduct = async (productId: string, productName: string) => {
    const confirmation = window.confirm(
      `Vas a eliminar el producto "${productName}". Esta accion no se puede deshacer. Deseas continuar?`,
    );
    if (!confirmation) return;

    setDeletingProductId(productId);
    try {
      await removeProduct(productId);
      if (editingProductId === productId) {
        handleCancelEdit();
      }
      onProductCreated?.();
    } finally {
      setDeletingProductId(null);
    }
  };

  return (
    <SectionCard>
      <SectionHeader>
        <SectionTitle>Productos</SectionTitle>
        <SectionMeta>{products.length} disponibles</SectionMeta>
      </SectionHeader>

      <SummaryGrid>
        <SummaryCard>
          <p>Total catalogo</p>
          <strong>{summary.total}</strong>
        </SummaryCard>
        <SummaryCard>
          <p>Activos</p>
          <strong>{summary.active}</strong>
        </SummaryCard>
        <SummaryCard>
          <p>Inactivos</p>
          <strong>{summary.inactive}</strong>
        </SummaryCard>
        <SummaryCard>
          <p>Con codigo</p>
          <strong>{summary.withBarcode}</strong>
        </SummaryCard>
      </SummaryGrid>

      <FormGrid onSubmit={handleSubmit}>
        <Fields>
          <Field>
            Nombre del producto
            <InputControl
              value={form.nombre}
              onChange={(event) => setForm((prev) => ({ ...prev, nombre: event.target.value }))}
              placeholder="Ej: Carta astral premium"
              required
            />
          </Field>
          <Field>
            Codigo de barra (opcional)
            <InputControl
              value={form.codigoBarra}
              onChange={(event) => setForm((prev) => ({ ...prev, codigoBarra: event.target.value }))}
              placeholder="Ej: 7701234567890"
            />
          </Field>
          <Field>
            Precio de venta
            <InputControl
              inputMode="decimal"
              value={form.precioVenta}
              onChange={(event) => setForm((prev) => ({ ...prev, precioVenta: event.target.value }))}
              placeholder="Ej: 90000"
              required
            />
          </Field>
          <Field>
            Estado
            <SelectControl
              value={form.estado ? 'ACTIVO' : 'INACTIVO'}
              style={{ color: form.estado ? '#1d6046' : '#5d636a' }}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  estado: event.target.value === 'ACTIVO',
                }))
              }
            >
              <option value="ACTIVO">Activo</option>
              <option value="INACTIVO">Inactivo</option>
            </SelectControl>
          </Field>
        </Fields>

        <Field>
          Descripcion breve (opcional)
          <TextAreaControl
            value={form.descripcion}
            onChange={(event) => setForm((prev) => ({ ...prev, descripcion: event.target.value }))}
            placeholder="Ej: Sesion guiada con lectura simbolica y orientacion personalizada."
          />
        </Field>

        {(formError || friendlyCreateError) && (
          <StatusState
            kind={formError ? 'error' : isSetupError(createError) ? 'info' : 'error'}
            message={formError ?? friendlyCreateError ?? 'Error inesperado.'}
          />
        )}
        {friendlyUpdateError && (
          <StatusState
            kind={isSetupError(updateError) ? 'info' : 'error'}
            message={friendlyUpdateError}
          />
        )}
        {createStatus === 'success' && <StatusState kind="info" message="Producto creado correctamente." />}
        {updateStatus === 'success' && <StatusState kind="info" message="Producto actualizado correctamente." />}
        {(friendlyDeleteError || deleteStatus === 'success') && (
          <StatusState
            kind={friendlyDeleteError ? 'error' : 'info'}
            message={friendlyDeleteError ?? 'Producto eliminado correctamente.'}
          />
        )}

        <ButtonsRow>
          <PrimaryButton type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando...' : editingProductId ? 'Guardar cambios' : 'Registrar producto'}
          </PrimaryButton>
          {editingProductId && (
            <GhostButton type="button" onClick={handleCancelEdit}>
              Cancelar edicion
            </GhostButton>
          )}
          <GhostButton type="button" onClick={() => reload()}>
            Actualizar catalogo
          </GhostButton>
        </ButtonsRow>
      </FormGrid>

      <Divider />

      {status === 'loading' && <StatusState kind="loading" message="Cargando productos..." />}
      {status === 'error' && (
        <StatusState
          kind={isSetupError(error) ? 'info' : 'error'}
          message={friendlyLoadError ?? 'Error inesperado.'}
        />
      )}
      {status === 'success' && products.length === 0 && (
        <StatusState
          kind="empty"
          message="No hay productos registrados. Crea el primero con el formulario."
        />
      )}

      {status === 'success' && products.length > 0 && (
        <TableWrap>
          <DataTable>
            <thead>
              <tr>
                <th>Producto</th>
                <th className="hide-mobile">Codigo</th>
                <th className="num">Venta</th>
                <th>Estado</th>
                <th className="hide-mobile">Actualizado</th>
                <th className="actions">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td>{product.nombre}</td>
                  <td className="hide-mobile">{product.codigoBarra ?? 'Sin codigo'}</td>
                  <td className="num">{formatMoney(product.precioVenta)}</td>
                  <td>
                    <Tag $tone={product.estado ? 'ok' : 'off'}>
                      {product.estado ? 'Activo' : 'Inactivo'}
                    </Tag>
                  </td>
                  <td className="hide-mobile">{formatDateTime(product.updatedAt)}</td>
                  <td className="actions">
                    <TableActions>
                      <GhostButton
                        type="button"
                        onClick={() => handleStartEditProduct(product.id)}
                        disabled={deleteStatus === 'submitting'}
                      >
                        Editar
                      </GhostButton>
                      <DangerButton
                        type="button"
                        onClick={() => handleDeleteProduct(product.id, product.nombre)}
                        disabled={deleteStatus === 'submitting'}
                      >
                        {deleteStatus === 'submitting' && deletingProductId === product.id
                          ? 'Eliminando...'
                          : 'Eliminar'}
                      </DangerButton>
                    </TableActions>
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </TableWrap>
      )}
    </SectionCard>
  );
}
