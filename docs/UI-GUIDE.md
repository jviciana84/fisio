# Guía de interfaz — Fisioterapia Roc Blanc

Documento **vivo**: lo iremos ampliando o corrigiendo según acordemos nuevas pantallas o cambios de estilo.

**Ubicación de estilos globales:** `app/globals.css` (clases `.glass-*`, `.app-shell-dashboard`, variables CSS).

---

## 1. Principios

- **Panel (dashboard):** fondo neutro gris claro; el contraste lo aportan las **tarjetas cristal** y los **bloques de formulario blancos** cuando haga falta legibilidad fuerte.
- **Acento de marca:** azules (`blue-600` … `cyan-500`) en etiquetas en mayúsculas, enlaces y botones principales.
- **Texto:** `slate-900` títulos, `slate-600` / `slate-700` cuerpo y etiquetas.
- **Login:** mantiene su propia composición (columna izquierda con degradado azul + SVG); no mezclar ese layout con el del panel.

---

## 2. Shell del dashboard

- El layout autenticado usa la clase **`app-shell-dashboard`** en el contenedor raíz (`app/(dashboard)/layout.tsx`).
- Hoy equivale a **`min-height: 100vh`** y **`background: var(--background)`** (`#f1f5f9`, slate ~100).
- Cualquier cambio de “fondo general del panel” debe hacerse ahí o en las variables `:root` de `globals.css`.

---

## 3. Vidrio flotante (tarjetas contenedoras)

Clases definidas en `globals.css`:

| Clase | Uso |
|--------|-----|
| **`glass-panel`** | Contenedor principal de una página o sección (un solo bloque grande o envoltorio). |
| **`glass-panel-strong`** | Variante un poco más opaca y con sombra más marcada (p. ej. modales si aplica). |
| **`glass-input`** | Inputs con aspecto cristal (p. ej. sobre fondos muy claros o cuando el diseño lo pida). |

Comportamiento habitual:

- Bordes suaves, **backdrop-blur**, sombras en capas, ligero **hover** (sube unos px) en dispositivos con hover; respetar `prefers-reduced-motion`.

**Patrón típico de página simple** (solo contenido informativo):

```tsx
<main className="p-6 md:p-8">
  <div className="glass-panel mx-auto max-w-5xl p-8">
    <p className="text-xs uppercase tracking-[0.15em] text-blue-600">Etiqueta sección</p>
    <h1 className="mt-3 text-3xl font-semibold text-slate-900">Título</h1>
    <p className="mt-2 text-slate-600">Texto…</p>
  </div>
</main>
```

---

## 4. Página con contexto + formulario (dos columnas)

**Referencia implementada:** `app/(dashboard)/dashboard/configuracion/usuarios/page.tsx` (Alta de usuarios).

Estructura recomendada:

1. **Outer:** `glass-panel` + `max-w-5xl` (u otro ancho máximo coherente) + padding generoso.
2. **Columna izquierda:** etiqueta “Configuración” (o similar), **título** y **párrafo explicativo**; no mezclar aquí los campos del formulario.
3. **Separador:**
   - Desktop: **línea vertical** (`w-px`, `bg-gradient-to-b`, `from-transparent via-slate-300 to-transparent`).
   - Móvil: **`<hr />`** entre bloques.
4. **Columna derecha:** **caja de diálogo** para el formulario:
   - Fondo **`bg-white`**, borde **`border-2 border-slate-200`**, **sombra fuerte** (`shadow-[…]` o `shadow-2xl`) para que se distinga del vidrio.
   - Título corto del formulario (p. ej. “Nuevo acceso”) + opcional subtítulo en `text-xs text-slate-500`.
   - Campos con **`border border-slate-200`**, **`bg-slate-50`**, foco **`focus:border-blue-500`**, **`focus:ring-2 focus:ring-blue-100`** (mejor contraste que `glass-input` dentro del blanco).

Botón principal de envío:

- `bg-gradient-to-r from-blue-600 to-cyan-500`, texto blanco, sombra azul suave.

Mensajes de éxito / error:

- Éxito: `border-blue-200 bg-blue-50 text-blue-800`.
- Error: `border-rose-200 bg-rose-50 text-rose-800`.

**Alta de usuarios (datos de negocio):** roles **Staff** y **Admin**; fila email + **teléfono (obligatorio)**; fila PIN + **código usuario** (4 cifras, sin prefijos; se obtiene con `GET /api/admin/staff` y se envía como `userCode` en `POST`). Columna BD: `employee_code`. Migración: `003_staff_phone_employee_code_roles.sql`.

**Alta de productos:** misma disposición (columna explicación + formulario blanco). `GET /api/admin/products` devuelve `productCode` (4 cifras); `POST` con nombre, descripción opcional, `priceEuros` y `productCode`. Tabla `products`, migración `004_products.sql`. Enlace en sidebar: Configuración → Alta de productos.

**Gastos fijos:** columna explicación como otras altas; formulario compacto (concepto | categoría, importe | periodicidad). `GET /api/admin/expense-categories` → categorías ya usadas (para datalist). `POST /api/admin/expenses` con `concept`, `notes?`, `category`, `amountEuros`, `recurrence`; `expenseDate` opcional (si no se envía, fecha del servidor). Tabla `expenses`: migraciones `005_expenses.sql` y `006_expenses_gastos_fijos.sql`.

---

## 5. Tipografía y jerarquía

- **Etiqueta de sección** (encima del título): `text-xs font-semibold uppercase tracking-wider text-blue-600`.
- **Título de página:** `text-2xl` o `text-3xl font-semibold text-slate-900` (según densidad).
- **Cuerpo:** `text-sm` o `text-[15px] leading-relaxed text-slate-600`.

---

## 6. Sidebar

- Comportamiento acordado: **colapsado** muestra iconos; **expandido al hover** con texto.
- Marca superior: icono **`LoginHeroMark`** (curvas del SVG del login), trazos **negros** (`text-black` / `currentColor`).
- Ítems activos: fondo blanco semitransparente; iconos en tonos **azul / slate** según estado.

Archivo: `components/layout/DashboardSidebar.tsx`.

---

## 7. Modales y sesión admin

- Aviso de inactividad (admin): `AdminIdleSessionGuard` — fondo oscuro semitransparente + **`glass-panel-strong`** para el contenido; botón con degradado azul como el resto de la app.

---

## 8. Checklist al crear una página nueva en el dashboard

- [ ] `<main className="p-6 md:p-8">` (o padding coherente con el resto).
- [ ] Contenedor principal con **`glass-panel`** (y `max-w-*` acorde).
- [ ] Si hay formulario importante: **columna explicativa + separador + caja blanca** como en Alta de usuarios.
- [ ] Títulos y etiquetas siguen la jerarquía de la sección 5.
- [ ] Botones primarios: degradado azul → cyan.
- [ ] Probar en ancho móvil (separador horizontal, formulario debajo del texto).

---

## 9. Historial de cambios (manual)

| Fecha | Cambio |
|--------|--------|
| 2026-04-15 | Primera versión: guía basada en panel neutro, vidrio flotante, patrón dos columnas + formulario tipo diálogo (Alta usuarios), sidebar y referencias en `globals.css`. |

*Añade aquí filas cuando fijemos decisiones nuevas.*
