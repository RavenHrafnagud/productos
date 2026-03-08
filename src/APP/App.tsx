/**
 * Componente raiz de aplicacion.
 * Orquesta autenticacion, sucursales, productos e inventario.
 */
import { useEffect, useMemo, useState } from 'react';
import { LoginScreen } from '../AUTH/components/LoginScreen';
import { useAuthSession } from '../AUTH/hooks/useAuthSession';
import { BranchesSection } from '../BRANCHES/components/BranchesSection';
import { useBranches } from '../BRANCHES/hooks/useBranches';
import type { CreateBranchInput } from '../BRANCHES/types/Branch';
import { InventorySection } from '../INVENTORY/components/InventorySection';
import { ProductsSection } from '../PRODUCTS/components/ProductsSection';
import { appEnv, isSupabaseConfigured } from '../SHARED/config/env';
import { StatusState } from '../SHARED/ui/StatusState';
import { isSetupError, toFriendlySupabaseMessage } from '../SHARED/utils/supabaseGuidance';
import {
  ActionButton,
  AlertStrip,
  Brand,
  Grid,
  Header,
  HeaderCopy,
  HeaderTitle,
  Page,
  Toolbar,
  UserPill,
} from './styles/AppShell.styles';

export default function App() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState(appEnv.defaultBranchId);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const { session, loading, authError, signIn, signOut, clearAuthError } = useAuthSession();
  const {
    branches,
    status,
    error,
    createStatus,
    createError,
    updateStatus,
    updateError,
    deleteStatus,
    deleteError,
    addBranch,
    editBranch,
    removeBranch,
    reload,
  } = useBranches(refreshKey);

  // Si no hay una sucursal elegida, toma la primera activa en memoria.
  useEffect(() => {
    if (selectedBranchId || branches.length === 0) return;
    const firstActiveBranch = branches.find((branch) => branch.estado) ?? branches[0];
    setSelectedBranchId(firstActiveBranch.id);
  }, [branches, selectedBranchId]);

  // Si la sucursal seleccionada fue eliminada o ya no existe, limpia y reasigna una disponible.
  useEffect(() => {
    if (!selectedBranchId) return;
    const selectedStillExists = branches.some((branch) => branch.id === selectedBranchId);
    if (selectedStillExists) return;
    const nextBranch = branches.find((branch) => branch.estado) ?? branches[0];
    setSelectedBranchId(nextBranch?.id ?? '');
  }, [branches, selectedBranchId]);

  const currentUser = useMemo(() => session?.user?.email ?? 'Usuario autenticado', [session?.user?.email]);
  const friendlyDashboardError = toFriendlySupabaseMessage(error, 'general');

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const handleCreateBranch = async (input: CreateBranchInput) => {
    const branch = await addBranch(input);
    setSelectedBranchId(branch.id);
  };

  const handleDeleteBranch = async (branchId: string) => {
    await removeBranch(branchId);
    setSelectedBranchId((currentId) => (currentId === branchId ? '' : currentId));
  };

  const handleUpdateBranch = async (branchId: string, input: CreateBranchInput) => {
    const updatedBranch = await editBranch(branchId, input);
    if (!updatedBranch.estado) {
      setSelectedBranchId((currentId) => (currentId === branchId ? '' : currentId));
    }
  };

  const handleLogin = async (email: string, password: string) => {
    setAuthSubmitting(true);
    try {
      await signIn(email, password);
    } finally {
      setAuthSubmitting(false);
    }
  };

  const handleLogout = async () => {
    setLogoutLoading(true);
    try {
      await signOut();
      setSelectedBranchId(appEnv.defaultBranchId);
    } finally {
      setLogoutLoading(false);
    }
  };

  if (!isSupabaseConfigured) {
    return (
      <Page>
        <Header>
          <Brand>{appEnv.companyName}</Brand>
          <HeaderTitle>Configuracion pendiente</HeaderTitle>
          <HeaderCopy>
            Debes completar las variables de entorno para establecer la conexion con Supabase.
          </HeaderCopy>
        </Header>
        <AlertStrip>
          Completa <strong>VITE_SUPABASE_URL</strong> y <strong>VITE_SUPABASE_ANON_KEY</strong> en el archivo
          <strong> .env</strong>.
        </AlertStrip>
      </Page>
    );
  }

  if (loading) {
    return (
      <Page>
        <StatusState kind="loading" message="Verificando sesion segura..." />
      </Page>
    );
  }

  if (!session) {
    return (
      <LoginScreen
        companyName={appEnv.companyName}
        adminEmail={appEnv.adminEmail}
        busy={authSubmitting}
        authError={authError}
        onLogin={handleLogin}
        onClearError={clearAuthError}
      />
    );
  }

  return (
    <Page>
      <Header>
        <Brand>{appEnv.companyName}</Brand>
        <HeaderTitle>Centro de control comercial</HeaderTitle>
        <HeaderCopy>
          Registra sucursales, crea productos y carga inventario inicial desde una sola interfaz.
        </HeaderCopy>

        <Toolbar>
          <UserPill>{currentUser}</UserPill>
          <ActionButton type="button" onClick={handleRefresh}>
            Actualizar panel
          </ActionButton>
          <ActionButton type="button" onClick={handleLogout} disabled={logoutLoading}>
            {logoutLoading ? 'Cerrando...' : 'Cerrar sesion'}
          </ActionButton>
        </Toolbar>
      </Header>

      {(error || authError) && (
        <AlertStrip>
          {error
            ? isSetupError(error)
              ? friendlyDashboardError
              : error
            : authError ?? 'Ocurrio un error al cargar el tablero.'}
        </AlertStrip>
      )}

      <Grid>
        <BranchesSection
          branches={branches}
          status={status}
          error={error}
          createStatus={createStatus}
          createError={createError}
          updateStatus={updateStatus}
          updateError={updateError}
          deleteStatus={deleteStatus}
          deleteError={deleteError}
          onCreateBranch={handleCreateBranch}
          onUpdateBranch={handleUpdateBranch}
          onDeleteBranch={handleDeleteBranch}
          onReload={reload}
        />
        <ProductsSection refreshKey={refreshKey} onProductCreated={handleRefresh} />
        <InventorySection
          branchId={selectedBranchId}
          branches={branches}
          onBranchChange={setSelectedBranchId}
          refreshKey={refreshKey}
        />
      </Grid>
    </Page>
  );
}
