# Fisio Web - Login PIN + TOTP con Supabase

Proyecto Next.js (App Router + TypeScript + Tailwind) para gestion de centro de fisioterapia.

## 1) Variables de entorno

1. Copia `.env.example` a `.env.local`.
2. Completa las variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
AUTH_CHALLENGE_SECRET=
```

`AUTH_CHALLENGE_SECRET` debe ser un secreto largo y aleatorio.

## 2) Crear tabla en Supabase

Ejecuta `supabase/schema.sql` en el editor SQL de Supabase.

Tabla usada por el login:
- `staff_access`: PIN hasheado, rol, bandera `requires_2fa`, secreto TOTP y estado activo.

## 3) Arrancar proyecto

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). La ruta raiz redirige a `/login`.

## 4) Flujo de acceso implementado

- Paso 1: PIN de 4 digitos (`/api/auth/pin`).
- Paso 2 (condicional): TOTP de 6 digitos (`/api/auth/totp`) solo si `requires_2fa = true`.
- Si todo es correcto, se crea cookie de sesion y redirige a `/dashboard`.

## Nota de seguridad

No guardes PIN en texto plano. Usa `pin_hash` y `pin_salt`. En produccion, agrega bloqueo por intentos y auditoria de accesos.
