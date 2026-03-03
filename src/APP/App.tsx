/**
 * Composicion principal.
 * Orquesta los modulos de Productos, Inventario y Ventas.
 */
import { FormEvent, useState } from 'react';
import { InventorySection } from '../INVENTORY/components/InventorySection';
import { ProductsSection } from '../PRODUCTS/components/ProductsSection';
import { SalesSection } from '../SALES/components/SalesSection';
import { appEnv, isSupabaseConfigured } from '../SHARED/config/env';
import {
  ActionButton,
  AlertStrip,
  Controls,
  Grid,
  Header,
  HeaderCopy,
  HeaderTitle,
  Input,
  Page,
  SecondaryButton,
} from './styles/AppShell.styles';

export default function App() {
  const [localInput, setLocalInput] = useState(appEnv.defaultLocalId);
  const [localId, setLocalId] = useState(appEnv.defaultLocalId);
  const [refreshKey, setRefreshKey] = useState(0);

  const canLoadOperationalModules = Boolean(localId.trim());

  const handleApplyLocal = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalId(localInput.trim());
    setRefreshKey((prev) => prev + 1);
  };

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <Page>
      <Header>
        <HeaderTitle>Panel operativo de productos</HeaderTitle>
        <HeaderCopy>
          Estructura modular React + TypeScript conectada a Supabase por dominios.
        </HeaderCopy>

        <Controls onSubmit={handleApplyLocal}>
          <Input
            value={localInput}
            onChange={(event) => setLocalInput(event.target.value)}
            placeholder="UUID del local para ventas e inventario"
            aria-label="UUID del local"
          />
          <ActionButton type="submit">Aplicar local</ActionButton>
          <SecondaryButton type="button" onClick={handleRefresh}>
            Refrescar datos
          </SecondaryButton>
        </Controls>
      </Header>

      {!isSupabaseConfigured && (
        <AlertStrip>
          Configura <strong>VITE_SUPABASE_URL</strong> y{' '}
          <strong>VITE_SUPABASE_ANON_KEY</strong> para habilitar la conexion.
        </AlertStrip>
      )}

      {isSupabaseConfigured && !canLoadOperationalModules && (
        <AlertStrip>
          Ingresa un <strong>local_id</strong> para consultar inventario y ventas.
        </AlertStrip>
      )}

      <Grid>
        <ProductsSection refreshKey={refreshKey} />
        <SalesSection localId={localId} refreshKey={refreshKey} />
        <InventorySection localId={localId} refreshKey={refreshKey} />
      </Grid>
    </Page>
  );
}
