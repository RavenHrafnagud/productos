# El Tarot como Guia - Panel Administrativo

Frontend en React + TypeScript para poblar y operar una base Supabase inicialmente vacia.

## Que incluye esta version

- Login seguro con Supabase Auth (correo + clave fuerte).
- Registro de sucursales desde interfaz.
- Registro de productos desde interfaz.
- Carga de inventario inicial y ajustes de stock desde interfaz.
- Branding de la empresa: **El Tarot como Guia**.
- Arquitectura modular por dominios (screaming architecture).

## Estructura de carpetas

```text
src/
  APP/         # composicion general y shell visual
  AUTH/        # inicio/cierre de sesion
  BRANCHES/    # sucursales
  PRODUCTS/    # catalogo de productos
  INVENTORY/   # inventario por sucursal
  SHARED/      # componentes, utilidades, cliente Supabase y tipos
database/
  001_bootstrap_admin.sql  # script de administrador inicial
  005_fix_admin_branch_permissions.sql  # corrige permisos RLS para sucursales
  006_update_locales_estado.sql  # elimina gerente_persona_id y renombra activo->estado
  007_secure_delete_helpers.sql  # funciones seguras para eliminar productos/sucursales en cascada
  008_update_productos_estado.sql  # elimina precio_compra y renombra activo->estado en productos
  009_drop_usuario_locales.sql  # elimina la tabla operaciones.usuario_locales y FKs relacionadas
  010_merge_detalle_venta_into_ventas.sql  # integra detalle_venta en ventas y elimina tablas legacy
  011_fix_operaciones_rls_after_usuario_locales.sql  # repara politicas RLS de operaciones para admins
  012_update_movimientos_usuario_id.sql  # cambia persona_id por usuarios_id en movimientos_inventario
  013_refactor_identidad_estado_roles.sql  # refactor en identidad (estado/roles/usuarios)
```

## Configuracion local

1. Copia `.env.example` a `.env`.
2. Completa estas variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_COMPANY_NAME` (opcional)
   - `VITE_ADMIN_EMAIL` (opcional)
   - `VITE_DEFAULT_BRANCH_ID` (opcional)
3. Instala dependencias:
   - `yarn install`
4. Levanta el proyecto:
   - `yarn dev`

## Usuario administrador inicial

Para crear el administrador solicitado, ejecuta en Supabase SQL Editor:

- Archivo: `database/001_bootstrap_admin.sql`
- Correo creado: `hrafnfreistudrr@gmail.com`
- Contrasena configurada: `$%&Heimdallr-Emperatriz123$%&`

El script:
- crea/actualiza usuario en `auth.users` con hash seguro (`crypt` + `gen_salt`),
- crea identidad en `auth.identities`,
- crea persona/usuario de negocio en esquema `identidad`,
- asigna rol `admin`.

## Seguridad aplicada en frontend

- No se construyen consultas SQL manuales en cliente.
- Todas las operaciones usan SDK oficial de Supabase (consultas parametrizadas).
- Validaciones de entrada para correo, texto y montos.
- Requisito de clave fuerte en login.
- Bloqueo temporal tras multiples intentos fallidos.
- Sesion gestionada por Supabase Auth.

## Scripts

- `yarn dev`: desarrollo
- `yarn typecheck`: validacion TypeScript
- `yarn lint`: analisis estatico
- `yarn build`: typecheck + build
- `yarn preview`: preview de build

## Nota operativa

La seguridad final depende de tu configuracion de RLS/policies en Supabase.  
Este frontend ya esta preparado para trabajar con esas politicas de forma segura.

