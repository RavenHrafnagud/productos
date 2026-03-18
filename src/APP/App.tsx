/**
 * Componente raiz de aplicacion.
 * Orquesta autenticacion y rutas por modulos del panel.
 */
import { Suspense, lazy, useEffect, useMemo, useState, type ReactElement } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { LoginScreen } from '../AUTH/components/LoginScreen';
import { useAuthSession } from '../AUTH/hooks/useAuthSession';
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
const BranchesSection = lazy(() =>
  import('../BRANCHES/components/BranchesSection').then((module) => ({
    default: module.BranchesSection,
  })),
);
const UsersSection = lazy(() =>
  import('../USERS/components/UsersSection').then((module) => ({
    default: module.UsersSection,
  })),
);
import {
  ActionButton,
  AlertStrip,
  Brand,
  Header,
  HeaderCopy,
  HeaderTitle,
  MainContent,
  MobileMenuButton,
  MobileMenuPanel,
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

const AREA_ICONS: Record<AppArea, ReactElement> = {
  dashboard: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="6.5" cy="7" r="2.3" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="16.5" cy="5.5" r="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="14.5" cy="16.5" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8.6 8.2l5.4 6.2M8.4 6.4l6.2-1.4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ),
  ventas: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="8" cy="9" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="15.5" cy="13.5" r="4" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M6.8 9h2.4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ),
  productos: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="5" y="4.5" width="14" height="16" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 8.2h8M8 11.2h8" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M12 14.4l1.1 2.2 2.4.3-1.8 1.6.5 2.4-2.2-1.2-2.2 1.2.5-2.4-1.8-1.6 2.4-.3z" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  ),
  sucursales: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 21s6-6.2 6-11a6 6 0 1 0-12 0c0 4.8 6 11 6 11z" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="10" r="2.6" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 6.6l.9 1.6 1.8.2-1.3 1.2.3 1.8-1.7-.9-1.7.9.3-1.8-1.3-1.2 1.8-.2z" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
    </svg>
  ),
  inventario: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 7.5h14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="6" y="7.5" width="12" height="11" rx="2.2" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M9.5 5.3c.4 1 .2 2.2-.7 3.2 1.2-.3 2.4.2 3.1 1.2" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  ),
  usuarios: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M4 20c1.8-3.6 5-6 8-6s6.2 2.4 8 6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M7.5 4.2h9" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  ),
};

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
  if (role === 'usuario') return area === 'ventas';
  return area === 'dashboard';
}

function resolveDefaultRoute(role: UserRole) {
  if (role === 'usuario') return '/ventas';
  return '/dashboard';
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
  const [drawerOpen, setDrawerOpen] = useState(false);

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
  const defaultRoute = useMemo(() => resolveDefaultRoute(identityRole), [identityRole]);
  const friendlyAreaError = toFriendlySupabaseMessage(error, 'general');
  const displayError = identityRole === 'usuario' ? null : error;

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

  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const navigateTo = (path: string) => {
    navigate(path);
  };

  const handleDrawerToggle = () => {
    setDrawerOpen((prev) => !prev);
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
          <MobileMenuButton type="button" onClick={handleDrawerToggle} aria-expanded={drawerOpen}>
            <span className="hamburger" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path
                  d="M4 7h16M4 12h16M4 17h16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            Menú
          </MobileMenuButton>
          <UserPill>{currentUser}</UserPill>
          <ActionButton type="button" onClick={handleRefresh} className="toolbar-refresh">
            Actualizar panel
          </ActionButton>
          <ActionButton type="button" onClick={handleLogout} disabled={logoutLoading} className="toolbar-logout">
            {logoutLoading ? 'Cerrando...' : 'Cerrar sesion'}
          </ActionButton>
        </Toolbar>

        {drawerOpen && (
          <MobileMenuPanel>
            <SideMenuList>
              {visibleAreas.map((item) => (
                <SideMenuButton
                  key={item.id}
                  type="button"
                  $active={activeArea === item.id}
                  onClick={() => navigateTo(item.path)}
                >
                  <span className="menu-icon">{AREA_ICONS[item.id]}</span>
                  <span className="menu-text">
                    <strong>{item.label}</strong>
                    <small>{item.description}</small>
                  </span>
                </SideMenuButton>
              ))}
            </SideMenuList>
          </MobileMenuPanel>
        )}
      </Header>

      {(displayError || authError) && (
        <AlertStrip>
          {displayError
            ? isSetupError(displayError)
              ? friendlyAreaError
              : displayError
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
                <span className="menu-icon">{AREA_ICONS[item.id]}</span>
                <span className="menu-text">
                  <strong>{item.label}</strong>
                  <small>{item.description}</small>
                </span>
              </SideMenuButton>
            ))}
          </SideMenuList>
        </SideMenu>
        <MainContent>
          <Suspense fallback={<StatusState kind="loading" message="Cargando modulo..." />}>
            <Routes>
              <Route path="/" element={<Navigate to={defaultRoute} replace />} />
              <Route
                path="/dashboard"
                element={
                  hasAreaAccess(identityRole, 'dashboard') ? (
                    <DashboardSection refreshKey={refreshKey} />
                  ) : (
                    <Navigate to={defaultRoute} replace />
                  )
                }
              />
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
          </Suspense>
        </MainContent>
      </ShellLayout>
    </Page>
  );
}
