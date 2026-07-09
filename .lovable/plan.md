## Problema

La consulta a `user_roles` está devolviendo **403 permission denied for function has_role**. La política RLS de `user_roles` invoca `public.has_role(...)` pero el rol `authenticated` no tiene permiso `EXECUTE` sobre esa función, así que cualquier `SELECT` de `user_roles` falla. Eso rompe el `AppShell` (que consulta el rol) y bloquea toda la vista del dashboard.

El Excel `Libro1.xlsx` que adjuntaste contiene exactamente los mismos datos ya cargados (oct‑25 a may‑26), así que no requiere reimportación.

## Cambios

1. **Migración SQL** que otorgue permisos de ejecución sobre las funciones de seguridad:
   ```sql
   GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon;
   ```
   Y, por consistencia, revisar/otorgar sobre `tg_set_updated_at` y `handle_new_user` si aplica (estas son SECURITY DEFINER de sistema, normalmente ya OK).

2. Verificar tras la migración que:
   - `GET /rest/v1/user_roles?...` responde 200.
   - El dashboard carga sin caer en el error boundary.

## Nota

No se toca UI ni lógica de negocio; es sólo un `GRANT` faltante en la base.
