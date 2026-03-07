/**
 * Seccion de productos.
 * Permite registrar articulos y consultar el catalogo.
 */
import { FormEvent, useState } from 'react';
import { useProducts } from '../hooks/useProducts';
import { formatDateTime, formatMoney } from '../../SHARED/utils/format';
import { isSetupError, toFriendlySupabaseMessage } from '../../SHARED/utils/supabaseGuidance';
import { sanitizeText, toPositiveNumber } from '../../SHARED/utils/validators';
import { DataTable, TableWrap, Tag } from '../../SHARED/ui/DataTable';
import {
  ButtonsRow,
  Divider,
  Field,
  Fields,
  FormGrid,
  GhostButton,
  InputControl,
  PrimaryButton,
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
  precioCompra: string;
  precioVenta: string;
}

const EMPTY_FORM: ProductForm = {
  nombre: '',
  codigoBarra: '',
  descripcion: '',
  precioCompra: '',
  precioVenta: '',
};

export function ProductsSection({ refreshKey, onProductCreated }: ProductsSectionProps) {
  const { products, status, error, createStatus, createError, addProduct, reload } = useProducts(refreshKey);
  const [form, setForm] = useState<ProductForm>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const friendlyLoadError = toFriendlySupabaseMessage(error, 'productos');
  const friendlyCreateError = toFriendlySupabaseMessage(createError, 'productos');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const precioCompra = toPositiveNumber(form.precioCompra);
    const precioVenta = toPositiveNumber(form.precioVenta);
    const nombre = sanitizeText(form.nombre, 120);

    if (!nombre) {
      setFormError('El nombre del producto es obligatorio.');
      return;
    }

    if (precioCompra === null || precioVenta === null) {
      setFormError('Los precios deben ser numericos y mayores o iguales a cero.');
      return;
    }

    if (precioVenta < precioCompra) {
      setFormError('El precio de venta no debe ser menor al de compra.');
      return;
    }

    try {
      await addProduct({
        nombre,
        codigoBarra: sanitizeText(form.codigoBarra, 50),
        descripcion: sanitizeText(form.descripcion, 300),
        precioCompra,
        precioVenta,
      });
      setForm(EMPTY_FORM);
      onProductCreated?.();
    } catch {
      // El detalle de error se refleja en createError.
    }
  };

  return (
    <SectionCard>
      <SectionHeader>
        <SectionTitle>Productos</SectionTitle>
        <SectionMeta>{products.length} disponibles</SectionMeta>
      </SectionHeader>

      <FormGrid onSubmit={handleSubmit}>
        <Fields>
          <Field>
            Nombre del producto
            <InputControl
              value={form.nombre}
              onChange={(event) => setForm((prev) => ({ ...prev, nombre: event.target.value }))}
              placeholder="Carta astral premium"
              required
            />
          </Field>
          <Field>
            Codigo de barra (opcional)
            <InputControl
              value={form.codigoBarra}
              onChange={(event) => setForm((prev) => ({ ...prev, codigoBarra: event.target.value }))}
              placeholder="7701234567890"
            />
          </Field>
          <Field>
            Precio de compra
            <InputControl
              inputMode="decimal"
              value={form.precioCompra}
              onChange={(event) => setForm((prev) => ({ ...prev, precioCompra: event.target.value }))}
              placeholder="50000"
              required
            />
          </Field>
          <Field>
            Precio de venta
            <InputControl
              inputMode="decimal"
              value={form.precioVenta}
              onChange={(event) => setForm((prev) => ({ ...prev, precioVenta: event.target.value }))}
              placeholder="90000"
              required
            />
          </Field>
        </Fields>

        <Field>
          Descripcion breve (opcional)
          <TextAreaControl
            value={form.descripcion}
            onChange={(event) => setForm((prev) => ({ ...prev, descripcion: event.target.value }))}
            placeholder="Sesion guiada con lectura simbolica y orientacion personalizada."
          />
        </Field>

        {(formError || friendlyCreateError) && (
          <StatusState
            kind={formError ? 'error' : isSetupError(createError) ? 'info' : 'error'}
            message={formError ?? friendlyCreateError ?? 'Error inesperado.'}
          />
        )}
        {createStatus === 'success' && <StatusState kind="info" message="Producto creado correctamente." />}

        <ButtonsRow>
          <PrimaryButton type="submit" disabled={createStatus === 'submitting'}>
            {createStatus === 'submitting' ? 'Guardando...' : 'Registrar producto'}
          </PrimaryButton>
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
          message="Primero crea tu primer producto usando el formulario."
        />
      )}

      {status === 'success' && products.length > 0 && (
        <TableWrap>
          <DataTable>
            <thead>
              <tr>
                <th>Producto</th>
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
