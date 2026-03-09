/**
 * Componente raiz de aplicacion.
 * Orquesta autenticacion y rutas por modulos del panel.
 */
import { useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { LoginScreen } from '../AUTH/components/LoginScreen';
import { useAuthSession } from '../AUTH/hooks/useAuthSession';
import { BranchesSection } from '../BRANCHES/components/BranchesSection';
import { useBranches } from '../BRANCHES/hooks/useBranches';
import type { CreateBranchInput } from '../BRANCHES/types/Branch';
import { DashboardSection } from '../DASHBOARD/components/DashboardSection';
import { InventorySection } from '../INVENTORY/components/InventorySection';
import { ProductsSection } from '../PRODUCTS/components/ProductsSection';
import { SalesSection } from '../SALES/components/SalesSection';
import { appEnv, isSupabaseConfigured } from '../SHARED/config/env';
import { StatusState } from '../SHARED/ui/StatusState';
import { isSetupError, toFriendlySupabaseMessage } from '../SHARED/utils/supabaseGuidance';
import { getMyProfile } from '../USERS/api/userManagementRepository';
import { UsersSection } from '../USERS/components/UsersSection';
import {
  ActionButton,
  AlertStrip,
  Brand,
  Header,
  HeaderCopy,
  HeaderTitle,
  MainContent,
  Page,
  ShellLayout,
  SideMenu,
  SideMenuButton,
  SideMenuList,
  SideMenuTitle,
  Toolbar,
  UserPill,
} from './styles/AppShell.styles';

type AppArea = 'dashboard' | 'ventas' | 'productos' | 'sucursales' | 'inventario' | 'usuarios';
type UserRole = 'administrador' | 'gerente' | 'usuario' | null;

const AREA_MENU: Array<{ id: AppArea; path: string; label: string; description: string }> = [
  { id: 'dashboard', path: '/dashboard', label: 'Dashboard', description: 'Indicadores de venta y rendimiento comercial.' },
  { id: 'ventas', path: '/ventas', label: 'Ventas', description: 'Registro e historial de ventas por sucursal.' },
  { id: 'productos', path: '/productos', label: 'Productos', description: 'Catalogo, precios y estado de articulos.' },
  { id: 'sucursales', path: '/sucursales', label: 'Sucursales', description: 'Gestion de sedes y cobertura geografica.' },
  { id: 'inventario', path: '/inventario', label: 'Inventario', description: 'Existencias, ajustes y movimientos.' },
  { id: 'usuarios', path: '/usuarios', label: 'Usuarios', description: 'Perfil, roles y asignacion de permisos.' },
];

const AREA_TITLES: Record<AppArea, string> = {
  dashboard: 'Dashboard comercial',
  ventas: 'Modulo de ventas',
  productos: 'Modulo de productos',
  sucursales: 'Modulo de sucursales',
  inventario: 'Modulo de inventario',
  usuarios: 'Modulo de usuarios',
};

const AREA_COPY: Record<AppArea, string> = {
  dashboard: 'Visualiza indicadores por fecha, producto y sucursal para tomar decisiones rapidas.',
  ventas: 'Registra ventas y consulta el historial operativo de cada sucursal.',
  productos: 'Administra articulos del catalogo y su disponibilidad comercial.',
  sucursales: 'Controla datos de sedes, ubicacion y estado operativo.',
  inventario: 'Actualiza stock, revisa existencias y audita movimientos recientes.',
  usuarios: 'Consulta tu perfil y administra usuarios internos con sus roles.',
};

function resolveAreaFromPath(pathname: string): AppArea {
  const normalized = pathname.trim().toLowerCase();
  const match = AREA_MENU.find((item) => normalized === item.path || normalized.startsWith(`${item.path}/`));
  return match?.id ?? 'dashboard';
}

function normalizeRole(roleName: string | null | undefined): UserRole {
  const normalized = roleName?.trim().toLowerCase() ?? '';
  if (normalized === 'admin' || normalized === 'administrador') return 'administrador';
  if (normalized === 'gerente') return 'gerente';
  if (normalized === 'usuario') return 'usuario';
  return null;
}

function hasAreaAccess(role: UserRole, area: AppArea) {
  if (role === 'administrador') return true;
  if (role === 'gerente') return area !== 'usuarios';
  if (role === 'usuario') return area === 'dashboard' || area === 'ventas' || area === 'inventario';
  return area === 'dashboard';
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [refreshKey, setRefreshKey] = useState(0);
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState(appEnv.defaultBranchId);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [identityLabel, setIdentityLabel] = useState('');
  const [identityRole, setIdentityRole] = useState<UserRole>(null);

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
  const activeArea = useMemo(() => resolveAreaFromPath(location.pathname), [location.pathname]);

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

  const currentUser = useMemo(
    () => identityLabel || session?.user?.email || 'Usuario autenticado',
    [identityLabel, session?.user?.email],
  );
  const visibleAreas = useMemo(
    () => AREA_MENU.filter((item) => hasAreaAccess(identityRole, item.id)),
    [identityRole],
  );
  const friendlyAreaError = toFriendlySupabaseMessage(error, 'general');

  useEffect(() => {
    let mounted = true;

    async function loadIdentityLabel() {
      if (!session?.user?.id) {
        if (mounted) setIdentityLabel('');
        if (mounted) setIdentityRole(null);
        return;
      }

      try {
        const profile = await getMyProfile(session.user.id);
        if (!mounted) return;
        if (!profile) {
          setIdentityLabel(session.user.email ?? 'Usuario autenticado');
          setIdentityRole(null);
          return;
        }

        const fullName = `${profile.nombres} ${profile.apellidos}`.trim();
        const safeName = fullName.replace(/^sin nombres sin apellidos$/i, '').trim();
        const displayName = safeName || profile.email || session.user.email || 'Usuario autenticado';
        const roleLabel = profile.rolNombre ? ` | ${profile.rolNombre}` : '';
        setIdentityLabel(`${displayName}${roleLabel}`);
        setIdentityRole(normalizeRole(profile.rolNombre));
      } catch {
        if (!mounted) return;
        setIdentityLabel(session.user.email ?? 'Usuario autenticado');
        setIdentityRole(null);
      }
    }

    loadIdentityLabel().catch(() => undefined);

    return () => {
      mounted = false;
    };
  }, [session?.user?.email, session?.user?.id, refreshKey]);

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const navigateTo = (path: string) => {
    navigate(path);
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
        <HeaderTitle>{AREA_TITLES[activeArea]}</HeaderTitle>
        <HeaderCopy>{AREA_COPY[activeArea]}</HeaderCopy>

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
              ? friendlyAreaError
              : error
            : authError ?? 'Ocurrio un error al cargar el tablero.'}
        </AlertStrip>
      )}

      <ShellLayout>
        <SideMenu>
          <SideMenuTitle>Areas</SideMenuTitle>
          <SideMenuList>
            {visibleAreas.map((item) => (
              <SideMenuButton
                key={item.id}
                type="button"
                $active={activeArea === item.id}
                onClick={() => navigateTo(item.path)}
              >
                <strong>{item.label}</strong>
                <small>{item.description}</small>
              </SideMenuButton>
            ))}
          </SideMenuList>
        </SideMenu>
        <MainContent>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardSection refreshKey={refreshKey} />} />
            <Route
              path="/ventas"
              element={
                hasAreaAccess(identityRole, 'ventas') ? (
                  <SalesSection branches={branches} refreshKey={refreshKey} onSaleCreated={handleRefresh} />
                ) : (
                  <Navigate to="/dashboard" replace />
                )
              }
            />
            <Route
              path="/productos"
              element={
                hasAreaAccess(identityRole, 'productos') ? (
                  <ProductsSection refreshKey={refreshKey} onProductCreated={handleRefresh} />
                ) : (
                  <Navigate to="/dashboard" replace />
                )
              }
            />
            <Route
              path="/sucursales"
              element={
                hasAreaAccess(identityRole, 'sucursales') ? (
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
                ) : (
                  <Navigate to="/dashboard" replace />
                )
              }
            />
            <Route
              path="/inventario"
              element={
                hasAreaAccess(identityRole, 'inventario') ? (
                  <InventorySection
                    branchId={selectedBranchId}
                    branches={branches}
                    onBranchChange={setSelectedBranchId}
                    refreshKey={refreshKey}
                  />
                ) : (
                  <Navigate to="/dashboard" replace />
                )
              }
            />
            <Route
              path="/usuarios"
              element={
                hasAreaAccess(identityRole, 'usuarios') ? (
                  <UsersSection authUserId={session?.user?.id ?? ''} refreshKey={refreshKey} />
                ) : (
                  <Navigate to="/dashboard" replace />
                )
              }
            />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </MainContent>
      </ShellLayout>
    </Page>
  );
}
