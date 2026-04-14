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

Opción A: ejecuta `supabase/schema.sql` en el editor SQL de Supabase.

Opción B (terminal): añade `DATABASE_URL` en `.env.local` (cadena de conexión Postgres del panel; en Windows a veces hace falta el **pooler** `aws-0-…pooler.supabase.com:6543` si el host `db.…` solo resuelve en IPv6) y ejecuta:

```bash
npm run db:apply
```

Tabla usada por el login:
- `staff_access`: nombre, email opcional, PIN hasheado, rol, bandera `requires_2fa`, secreto TOTP y estado activo.

Si la tabla ya existía **sin** la columna `email`, ejecuta también `supabase/migrations/001_add_email_to_staff_access.sql`.

## 2.1) Doble factor TOTP (Google Authenticator)

Para un usuario que ya existe en `staff_access` (por email):

```bash
npm run totp:enable -- correo@ejemplo.com
```

El script activa `requires_2fa` y guarda un secreto nuevo. Muestra la **URI `otpauth://`** (para generar un QR) y el **secreto Base32** para entrada manual en Google Authenticator.

Variable opcional: `TOTP_ISSUER` (por defecto `Fisioterapia Roc Blanc`).

## 2.2) Crear el primer usuario admin (PIN hasheado)

Con `.env.local` configurado:

```bash
npm run seed:admin -- "Nombre Apellidos" correo@ejemplo.com 1234 admin
```

El script genera `pin_salt` y `pin_hash` igual que la API. Si el email ya existe, actualiza PIN y datos.

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
