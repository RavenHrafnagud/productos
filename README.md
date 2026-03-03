# Productos - Frontend modular con Supabase

Interfaz React + TypeScript para gestionar `productos`, `inventario` y `ventas` usando tu base de datos en Supabase.

## Stack

- React 19
- TypeScript
- styled-components
- Supabase JS
- Yarn 4
- Vite

## Arquitectura (Screaming Architecture)

El arbol de carpetas "grita" dominios de negocio, no tecnologia:

```text
src/
  APP/          # composicion y layout global
  PRODUCTS/     # modulo de catalogo de productos
  INVENTORY/    # modulo de stock por local
  SALES/        # modulo de resumen de ventas
  SHARED/       # utilidades, cliente Supabase, tipos y UI reusable
```

Cada modulo usa la misma estructura:

- `api/`: acceso a datos
- `hooks/`: estado de UI y consumo asincrono
- `components/`: presentacion
- `types/`: modelos del modulo

## Configuracion

1. Crea el archivo `.env` copiando `.env.example`.
2. Completa:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_DEFAULT_LOCAL_ID` (opcional)

## Scripts

- `yarn dev`: entorno local
- `yarn typecheck`: validacion TypeScript
- `yarn build`: typecheck + build de produccion
- `yarn preview`: previsualizacion build

## Flujo de datos

1. `APP/App.tsx` define `localId` y dispara recargas.
2. Cada modulo consume su hook (`useProducts`, `useInventory`, `useSalesSummary`).
3. El hook llama su repositorio (`api/*Repository.ts`).
4. El repositorio consulta Supabase por esquema:
   - `catalogo.productos`
   - `operaciones.inventario`
   - `ventas.ventas`
5. La UI renderiza estados (`loading`, `error`, `empty`, `success`).

## Guia rapida para extender

- Nuevo modulo de negocio:
  1. Crear carpeta dominio en `src/`.
  2. Implementar `types`, `api`, `hooks`, `components`.
  3. Conectar el componente en `APP/App.tsx`.
- Nuevas tablas en Supabase:
  1. Agregar tipos en `SHARED/types/database.ts`.
  2. Crear repositorio nuevo o ampliar uno existente.
  3. Reflejar cambios en hook + componente.
#Texto
