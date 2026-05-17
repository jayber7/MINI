# EICAP MINI - Sistema Contable Web

> Aplicación web contable de doble entrada, construida con Node.js/Express (backend) y React (frontend), inspirada en el sistema contable EICAP de escritorio (.NET Windows Forms).

---

## Tabla de Contenidos

1. [Descripción del Proyecto](#descripción-del-proyecto)
2. [Arquitectura](#arquitectura)
3. [Tecnologías](#tecnologías)
4. [Modelo de Datos](#modelo-de-datos)
5. [Autenticación y Autorización](#autenticación-y-autorización)
6. [Fases Completadas](#fases-completadas)
   - [Fase 1: Fundación](#fase-1-fundación--autenticación-y-gestión-de-usuarios)
   - [Fase 2: Core Contable](#fase-2-core-contable--plan-de-cuentas-y-comprobantes)
   - [Fase 3: Reportes Contables](#fase-3-reportes-contables)
   - [Fase 4: Exportación PDF y Excel](#fase-4-exportación-pdf-y-excel)
7. [Fases Pendientes](#fases-pendientes)
   - [Fase 5: Pulido UX](#fase-5-pulido-ux)
8. [Guía de Uso](#guía-de-uso)
9. [Estructura de Archivos](#estructura-de-archivos)
10. [Endpoints API](#endpoints-api)

---

## Descripción del Proyecto

EICAP MINI es un sistema contable web que implementa las funcionalidades principales del sistema contable EICAP de escritorio (desarrollado en .NET Windows Forms con SQLite). El sistema permite:

- Gestión de usuarios, roles y permisos
- Plan de cuentas jerárquico
- Registro de comprobantes contables con validación de balance (debe == haber)
- Generación de reportes contables: Libro Diario, Libro Mayor, Balance General, Estado de Resultados, Evolución del Patrimonio, Balance de Sumas y Saldos
- Configuración de empresa y gestión fiscal

**Credenciales por defecto:** `admin` / `admin123`

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT (React + Vite)                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │  Pages   │  │Components│  │ Services │  │ Context │ │
│  └──────────┘  └──────────┘  └──────────┘  └─────────┘ │
│                      │                                    │
│              axios (JWT interceptor)                      │
└──────────────────────┼──────────────────────────────────┘
                       │ HTTP/JSON
┌──────────────────────┼──────────────────────────────────┐
│                    SERVER (Express 5)                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────┐ │
│  │  Routes  │→ │Controllers│→ │ Services │  │Middleware│ │
│  └──────────┘  └──────────┘  └──────────┘  └─────────┘ │
│       │                                              │   │
│  ┌────┴─────────────────────────────────────────────┐  │
│  │              Models (Sequelize ORM)               │  │
│  └────────────────────┬─────────────────────────────┘  │
└───────────────────────┼────────────────────────────────┘
                        │
              ┌─────────┴─────────┐
              │  SQLite Database   │
              │  (database.sqlite) │
              └───────────────────┘
```

### Patrones de Diseño

- **Backend:** MVC con separación en capas (routes → controllers → services → models)
- **Frontend:** Componentes funcionales con hooks, Context API para estado global
- **Autenticación:** JWT stateless con interceptor de axios
- **Autorización:** Basada en roles y permisos (RBAC)
- **ORM:** Sequelize con asociaciones y hooks

---

## Tecnologías

### Backend (`api/`)

| Tecnología | Versión | Propósito |
|---|---|---|
| Node.js | 18.x | Runtime |
| Express | 5.2.1 | Framework web |
| Sequelize | 6.37.8 | ORM |
| SQLite (sqlite3) | 5.1.6 | Base de datos |
| bcryptjs | 3.0.3 | Hash de contraseñas |
| jsonwebtoken | 9.0.3 | Autenticación JWT |
| dotenv | 17.4.2 | Variables de entorno |
| cors | 2.8.6 | Cross-origin requests |
| pdfkit | latest | Generación de PDF |
| exceljs | latest | Generación de Excel |

### Frontend (`client/`)

| Tecnología | Versión | Propósito |
|---|---|---|
| React | 19.x | UI framework |
| Vite | 8.0.10 | Build tool |
| React Router DOM | 7.15.1 | Routing |
| Tailwind CSS | 4.2.4 | Styling |
| axios | 1.16.0 | HTTP client |
| lucide-react | 1.14.0 | Iconos |
| react-hot-toast | latest | Notificaciones toast |

---

## Modelo de Datos

### Usuarios y Autenticación

```
Usuario (id, username, email, password, nombreCompleto, activo, rolId)
    ↓
Rol (id, nombre, descripcion)
    ↓ (muchos-a-muchos)
Permiso (id, nombre, codigo, modulo)
    ↓
RolPermiso (rolId, permisoId)
```

### Core Contable

```
Empresa (id, nombre, nit, direccion, telefono, firmas..., gestionActualId)
    ↓
Gestion (id, year, glosa, fechaInicio, fechaFin, actividad, empresaId)
    ↓
PlanCuenta (id, codigo, nombre, nivel, padreId, tipo, clase, empresaId)
    ↓ (jerárquico: padreId → id)
PlanCuenta (hijos)

Proyecto (id, nombre, empresaId)

Comprobante (id, numero, tipoComprobante, glosa, fecha, estado, gestionId, empresaId, proyectoId, usuarioIdCrea, usuarioIdAnula)
    ↓
ComprobanteDetalle (id, comprobanteId, planCuentaId, glosa, debe, haber)
    ↓
PlanCuenta

CuentaEspecifica (id, codigo, numero, nombre, empresaId)
Cotizacion (id, fecha, ufv, usd)
```

### Tipos de Comprobante
- `ingreso` — Comprobante de ingreso
- `egreso` — Comprobante de egreso
- `traspaso` — Comprobante de traspaso

### Estados de Comprobante
- `activo` — Comprobante vigente
- `anulado` — Comprobante anulado
- `contabilizado` — Comprobante contabilizado

### Tipos de Cuenta
- `Activo` — Cuentas de activo
- `Pasivo` — Cuentas de pasivo
- `Patrimonio` — Cuentas de patrimonio
- `Ingreso` — Cuentas de ingreso
- `Gasto` — Cuentas de gasto

### Roles Predefinidos

| Rol | Descripción | Permisos |
|---|---|---|
| `admin` | Administrador del sistema | Todos los permisos |
| `contador` | Contador principal | Todos excepto gestión de usuarios, roles y configuración |
| `auxiliar` | Auxiliar contable | plan:read, comprobantes:read/create/update, reportes:read/export |

---

## Autenticación y Autorización

### Flujo de Autenticación

1. Usuario envía `POST /api/auth/login` con `{ username, password }`
2. Backend verifica credenciales con bcrypt
3. Si válidas, genera JWT con payload `{ id, username, email, rolId }`
4. Frontend almacena token en `localStorage`
5. Axios interceptor adjunta `Authorization: Bearer <token>` en cada request
6. Si token expira o es inválido (401), redirige a `/login`

### Middleware de Autorización

- `authMiddleware` — Verifica JWT y extrae usuario en `req.usuario`
- `requirePermisos(...permisos)` — Verifica que el usuario tenga al menos uno de los permisos requeridos
- `requireRol(...roles)` — Verifica que el usuario tenga uno de los roles requeridos

---

## Fases Completadas

### Fase 1: Fundación — Autenticación y Gestión de Usuarios

**Estado:** ✅ COMPLETADA

#### Backend

**Estructura en capas creada:**
```
api/src/
├── config/database.js          # Conexión Sequelize SQLite
├── models/                     # 12 modelos con asociaciones
│   ├── index.js                # Asociaciones entre modelos
│   ├── Usuario.js              # Con hooks de hash de password
│   ├── Rol.js
│   ├── Permiso.js
│   ├── RolPermiso.js           # Tabla intermedia muchos-a-muchos
│   ├── Empresa.js
│   ├── Gestion.js
│   ├── PlanCuenta.js
│   ├── Proyecto.js
│   ├── Comprobante.js
│   ├── ComprobanteDetalle.js
│   ├── CuentaEspecifica.js
│   └── Cotizacion.js
├── middleware/
│   ├── auth.js                 # Verificación JWT
│   ├── roles.js                # requirePermisos, requireRol
│   └── errorHandler.js         # Manejo global de errores
├── services/
│   └── auth.service.js         # generarToken()
├── controllers/
│   ├── auth.controller.js      # login, register, getMe
│   ├── usuario.controller.js   # CRUD completo usuarios
│   ├── rol.controller.js       # CRUD roles + asignación permisos
│   └── empresa.controller.js   # CRUD empresa
├── routes/
│   ├── index.js                # Agregador de rutas
│   ├── auth.routes.js
│   ├── usuarios.routes.js
│   ├── roles.routes.js
│   └── empresa.routes.js
├── seeds/
│   └── seed.js                 # 19 permisos, 3 roles, admin, empresa, gestión, 35 cuentas
└── index.js                    # Entry point Express
```

**Endpoints implementados (15):**

| Método | Ruta | Descripción | Auth | Permiso |
|---|---|---|---|---|
| POST | `/api/auth/login` | Login con JWT | No | — |
| POST | `/api/auth/register` | Registro de usuario | No | — |
| GET | `/api/auth/me` | Perfil actual | Sí | — |
| GET | `/api/usuarios` | Lista usuarios | Sí | admin |
| GET | `/api/usuarios/:id` | Obtener usuario | Sí | admin |
| POST | `/api/usuarios` | Crear usuario | Sí | admin |
| PUT | `/api/usuarios/:id` | Actualizar usuario | Sí | admin |
| PUT | `/api/usuarios/:id/password` | Cambiar contraseña | Sí | admin |
| DELETE | `/api/usuarios/:id` | Eliminar usuario | Sí | admin |
| GET | `/api/roles` | Lista roles | Sí | admin |
| GET | `/api/roles/permisos` | Lista permisos | Sí | — |
| POST | `/api/roles` | Crear rol | Sí | admin |
| PUT | `/api/roles/:id` | Actualizar rol | Sí | admin |
| PUT | `/api/roles/:id/permisos` | Asignar permisos a rol | Sí | admin |
| DELETE | `/api/roles/:id` | Eliminar rol | Sí | admin |
| GET | `/api/empresa` | Obtener empresa actual | Sí | — |

**Seeds iniciales:**
- 19 permisos organizados por módulo (usuarios, roles, plan, comprobantes, reportes, config)
- 3 roles: admin (todos), contador (sin gestión usuarios/roles), auxiliar (lectura + comprobantes)
- Usuario admin: `admin` / `admin123`
- Empresa: "Mi Empresa Académica" con NIT 123456789
- Gestión fiscal 2026
- Plan de cuentas con 35 cuentas jerárquicas (5 tipos)

#### Frontend

**Estructura creada:**
```
client/src/
├── context/
│   └── AuthContext.jsx         # AuthProvider, login, logout, tienePermiso, tieneRol
├── services/
│   └── api.js                  # Axios instance con interceptors JWT
├── components/
│   ├── Layout.jsx              # Sidebar responsive con menú dinámico
│   └── ProtectedRoute.jsx      # Ruta protegida con verificación de permisos
├── pages/
│   ├── Login.jsx               # Página de login con validación
│   ├── Dashboard.jsx           # Dashboard con stats y acciones rápidas
│   ├── Usuarios.jsx            # CRUD usuarios con tabla y formulario
│   ├── Roles.jsx               # CRUD roles con asignación visual de permisos
│   └── [placeholders]          # Páginas placeholder para módulos futuros
└── App.jsx                     # Router principal con rutas protegidas
```

**Características:**
- React Router con rutas protegidas por permisos
- AuthContext con login/logout/verificación de permisos
- Sidebar responsive con 12 items de menú
- Interceptor axios: auto-adjunta token, redirige a login en 401
- CRUD completo de usuarios con toggle activo/inactivo
- CRUD de roles con asignación visual de permisos por módulo

---

### Fase 2: Core Contable — Plan de Cuentas y Comprobantes

**Estado:** ✅ COMPLETADA

#### Backend

**Nuevos controllers:**

| Controller | Métodos | Descripción |
|---|---|---|
| `plan.controller.js` | listar, obtener, crear, actualizar, eliminar, generarSiguienteCodigo | CRUD plan de cuentas con validación de hijos |
| `comprobante.controller.js` | listar, obtener, crear, actualizar, anular, eliminar, obtenerTotales | CRUD comprobantes con **validación de balance** |
| `gestion.controller.js` | listar, obtener, obtenerActual, crear, actualizar, establecerActual, eliminar | Gestión de períodos fiscales |
| `proyecto.controller.js` | listar, obtener, crear, actualizar, eliminar | Centros de costo |

**Nuevas rutas:**
- `GET /api/plan-cuentas` — Lista todas las cuentas
- `GET /api/plan-cuentas/siguiente-codigo` — Genera siguiente código disponible
- `GET /api/plan-cuentas/:id` — Obtener cuenta con hijos
- `POST /api/plan-cuentas` — Crear cuenta (permiso: plan:create)
- `PUT /api/plan-cuentas/:id` — Actualizar cuenta (permiso: plan:update)
- `DELETE /api/plan-cuentas/:id` — Eliminar cuenta (permiso: plan:delete)
- `GET /api/comprobantes` — Lista con paginación y filtros
- `GET /api/comprobantes/:id` — Obtener comprobante completo con detalles
- `POST /api/comprobantes` — Crear comprobante (permiso: comprobantes:create)
- `PUT /api/comprobantes/:id` — Actualizar comprobante (permiso: comprobantes:update)
- `POST /api/comprobantes/:id/anular` — Anular comprobante (permiso: comprobantes:anular)
- `DELETE /api/comprobantes/:id` — Eliminar comprobante (permiso: comprobantes:update)
- `GET /api/gestiones` — Lista gestiones
- `GET /api/gestiones/actual` — Gestión actual
- `GET /api/proyectos` — Lista proyectos

**Reglas de negocio implementadas:**
- **Validación de balance:** Al crear/editar un comprobante, verifica que `suma(debe) == suma(haber)` con tolerancia de 0.01
- **Numeración automática:** Si no se proporciona número, genera el siguiente correlativo por gestión
- **Estado obligatorio:** Solo comprobantes `activo` pueden editarse o eliminarse
- **Anulación:** Mantiene registro pero marca como `anulado`, registra usuario y fecha de anulación
- **Protección de hijos:** No se puede eliminar una cuenta del plan que tenga cuentas hijas

#### Frontend

**Páginas implementadas:**

| Página | Características |
|---|---|
| **Plan de Cuentas** | Vista en árbol expandible, colores por tipo (Activo=verde, Pasivo=rojo, etc.), CRUD inline, generación de código, leyenda de tipos |
| **Comprobantes** | Lista con filtros (fecha, tipo, estado), formulario con líneas dinámicas (agregar/eliminar), validación de balance en tiempo real con indicador visual (✓ Balanceado / ✗ Diferencia), botones de editar/anular/eliminar, badges de estado |
| **Configuración** | Formulario completo de empresa con datos generales y firmas para reportes |

---

### Fase 3: Reportes Contables

**Estado:** ✅ COMPLETADA

#### Backend

**Controller:** `reporte.controller.js`

| Endpoint | Descripción | Lógica |
|---|---|---|
| `GET /api/reportes/libro-diario` | Lista comprobantes con detalles | Filtra por estado=activo, rango de fechas, proyecto. Agrupa por comprobante con totales debe/haber |
| `GET /api/reportes/libro-mayor` | Movimientos por cuenta con saldos | Calcula saldo corriente por tipo de cuenta. Activo/Gasto: debe-haber. Pasivo/Patrimonio/Ingreso: haber-debe |
| `GET /api/reportes/balance-general` | Activo = Pasivo + Patrimonio | Filtra cuentas por tipo, calcula saldos, incluye utilidad del ejercicio en patrimonio |
| `GET /api/reportes/estado-resultados` | Ingresos - Gastos = Utilidad | Calcula totales de ingresos y gastos, retorna utilidad neta |
| `GET /api/reportes/evolucion-patrimonio` | Patrimonio inicial + utilidad = final | Calcula patrimonio actual + utilidad del ejercicio |
| `GET /api/reportes/sumas-saldos` | Suma debe/haber + saldos por cuenta | Calcula sumas y saldos deudor/acreedor con totales generales |

**Funciones auxiliares:**
- `calcularPorTipo(tipo, desde, hasta)` — Calcula saldos de cuentas por tipo
- `calcularUtilidad(desde, hasta)` — Calcula utilidad del ejercicio (ingresos - gastos)

#### Frontend

**Páginas implementadas:**

| Página | Características |
|---|---|
| **Libro Diario** | Comprobantes agrupados con detalles expandibles, totales por comprobante, filtros por fecha |
| **Libro Mayor** | Tarjetas por cuenta con movimientos, saldo corriente, totales, filtro por cuenta específica |
| **Balance General** | Dos columnas (Activo vs Pasivo+Patrimonio), verificación de ecuación contable con indicador visual ✓/✗ |
| **Estado de Resultados** | Ingresos (azul) - Gastos (naranja) = Utilidad/Pérdida (verde/rojo) |
| **Evolución del Patrimonio** | Patrimonio inicial + utilidad del ejercicio = patrimonio final |
| **Sumas y Saldos** | Tabla 6 columnas con totales, indentación jerárquica, saldos deudor/acreedor |

**Características comunes:**
- Filtros por rango de fechas en todos los reportes
- Formato Bs. con separadores de miles
- Colores por tipo de cuenta
- Indentación jerárquica por nivel
- Botón de exportar (placeholder)
- Estados de carga y mensajes cuando no hay datos

---

## Fases Pendientes

### Fase 4: Exportación PDF y Excel

**Estado:** ✅ COMPLETADA

#### Backend

**Controller:** `export.controller.js`

| Función | Descripción |
|---|---|
| `exportarComprobantePDF` | PDF individual de comprobante con encabezado empresa, líneas detalladas, totales y firmas |
| `exportarTablaPDF` | Función genérica para PDF de reportes con cabecera empresa, tablas formateadas y pie con firmas |
| `exportarExcelGenerico` | Función genérica para Excel con encabezado empresa, hojas con estilos, formato numérico y firmas |

**Rutas implementadas (13):**

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/export/comprobante/:id/pdf` | PDF de comprobante individual |
| GET | `/api/export/libro-diario/pdf` | PDF Libro Diario |
| GET | `/api/export/libro-diario/excel` | Excel Libro Diario |
| GET | `/api/export/libro-mayor/pdf` | PDF Libro Mayor |
| GET | `/api/export/libro-mayor/excel` | Excel Libro Mayor |
| GET | `/api/export/balance-general/pdf` | PDF Balance General |
| GET | `/api/export/balance-general/excel` | Excel Balance General |
| GET | `/api/export/estado-resultados/pdf` | PDF Estado de Resultados |
| GET | `/api/export/estado-resultados/excel` | Excel Estado de Resultados |
| GET | `/api/export/evolucion-patrimonio/pdf` | PDF Evolución del Patrimonio |
| GET | `/api/export/evolucion-patrimonio/excel` | Excel Evolución del Patrimonio |
| GET | `/api/export/sumas-saldos/pdf` | PDF Sumas y Saldos |
| GET | `/api/export/sumas-saldos/excel` | Excel Sumas y Saldos |

**Características PDF:**
- Cabecera con nombre, NIT y dirección de empresa
- Tablas formateadas con encabezados en negrita
- Totales con línea separadora
- Pie con firmas configuradas (contador, propietario, representante legal)
- Fecha de generación en pie de página

**Características Excel:**
- Encabezado con datos de empresa
- Filas de encabezado con fondo azul claro y negrita
- Formato numérico `#,##0.00` en columnas de montos
- Filas de totales en negrita
- Filas de firmas con borde superior

#### Frontend

**Utilidad:** `exportarArchivo()` en `api.js`
- Descarga blobs con `axios({ responseType: 'blob' })`
- Crea URL temporal y simula click para descargar
- Revoca URL temporal después de descarga

**Páginas actualizadas (6):**
- Libro Diario, Libro Mayor, Balance General, Estado de Resultados, Evolución Patrimonio, Sumas y Saldos
- Botones separados para PDF (verde) y Excel (azul)
- Estado `exportando` para deshabilitar botones durante la descarga
- Filtros de fecha se pasan como parámetros query a las rutas de exportación

---

### Fase 5: Pulido UX

**Estado:** 🔄 EN PROGRESO

#### Implementado

- **Notificaciones toast** — `react-hot-toast` instalado, todos los `alert()` reemplazados por toasts
- **Modales de confirmación** — Componente `ConfirmModal.jsx` reutilizable para acciones destructivas (anular/eliminar)
- **Búsqueda** — Campo de búsqueda en Plan de Cuentas (código/nombre) y Comprobantes (Nº/glosa/usuario)
- **Paginación** — En lista de comprobantes (10 por página con controles de navegación)

#### Pendiente

- **Dashboard mejorado** — Gráficos básicos con totales financieros, comprobantes recientes
- **Responsive** — Mejorar diseño para tablets
- **Atajos de teclado** — Ctrl+N para nuevo comprobante, etc.

---

## Guía de Uso

### Requisitos

- Node.js 18+
- npm (gestor de paquetes)

### Instalación y Ejecución

#### Backend

```bash
cd api
npm install
cp .env.example .env  # si es necesario
node src/index.js
# Servidor corriendo en http://localhost:3001
```

#### Frontend

```bash
cd client
npm install
npx vite
# App corriendo en http://localhost:5173
```

### Primer Uso

1. Abrir `http://localhost:5173`
2. Iniciar sesión con `admin` / `admin123`
3. Ir a **Configuración** y actualizar datos de la empresa
4. Ir a **Plan de Cuentas** para revisar/agregar cuentas
5. Ir a **Comprobantes** → **Nuevo Comprobante** para registrar movimientos
6. Generar reportes desde el menú lateral

### Roles y Permisos

| Acción | Admin | Contador | Auxiliar |
|---|---|---|---|
| Ver Dashboard | ✓ | ✓ | ✓ |
| Plan de Cuentas (ver) | ✓ | ✓ | ✓ |
| Plan de Cuentas (crear/editar/eliminar) | ✓ | ✓ | ✗ |
| Comprobantes (ver) | ✓ | ✓ | ✓ |
| Comprobantes (crear/editar) | ✓ | ✓ | ✓ |
| Comprobantes (anular) | ✓ | ✓ | ✗ |
| Reportes | ✓ | ✓ | ✓ |
| Gestión de Usuarios | ✓ | ✗ | ✗ |
| Gestión de Roles | ✓ | ✗ | ✗ |
| Configuración Empresa | ✓ | ✗ | ✗ |

---

## Estructura de Archivos

```
MINI/
├── api/                              # Backend Express
│   ├── .env                          # Variables de entorno
│   ├── package.json
│   ├── database.sqlite               # Base de datos SQLite
│   └── src/
│       ├── index.js                  # Entry point
│       ├── config/
│       │   └── database.js           # Conexión Sequelize
│       ├── models/                   # 12 modelos Sequelize
│       ├── controllers/              # 8 controllers (auth, usuario, rol, empresa, plan, comprobante, gestion, proyecto, reporte, export)
│       ├── services/                 # auth.service.js
│       ├── middleware/               # auth, roles, errorHandler
│       ├── routes/                   # 10 archivos de rutas
│       └── seeds/
│           └── seed.js               # Datos iniciales
│
├── client/                           # Frontend React
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── src/
│       ├── main.jsx                  # Entry point
│       ├── App.jsx                   # Router principal
│       ├── index.css                 # Tailwind import
│       ├── context/
│       │   └── AuthContext.jsx       # Auth provider
│       ├── services/
│       │   └── api.js                # Axios instance
│       ├── components/
│       │   ├── Layout.jsx            # Sidebar + header
│       │   └── ProtectedRoute.jsx    # Route guard
│       └── pages/
│           ├── Login.jsx
│           ├── Dashboard.jsx
│           ├── Usuarios.jsx
│           ├── Roles.jsx
│           ├── PlanCuentas.jsx
│           ├── Comprobantes.jsx
│           ├── Configuracion.jsx
│           ├── LibroDiario.jsx
│           ├── LibroMayor.jsx
│           ├── BalanceGeneral.jsx
│           ├── EstadoResultados.jsx
│           ├── EvolucionPatrimonio.jsx
│           └── SumasSaldos.jsx
│
└── dotnet/                           # Proyecto original .NET (referencia)
    └── Contable/                     # Sistema contable EICAP Windows Forms
```

---

## Endpoints API

### Autenticación
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/api/auth/login` | No | Login |
| POST | `/api/auth/register` | No | Registro |
| GET | `/api/auth/me` | Sí | Perfil actual |

### Usuarios (admin)
| Método | Ruta | Auth | Permiso |
|---|---|---|---|
| GET | `/api/usuarios` | Sí | admin |
| GET | `/api/usuarios/:id` | Sí | admin |
| POST | `/api/usuarios` | Sí | admin |
| PUT | `/api/usuarios/:id` | Sí | admin |
| PUT | `/api/usuarios/:id/password` | Sí | admin |
| DELETE | `/api/usuarios/:id` | Sí | admin |

### Roles
| Método | Ruta | Auth | Permiso |
|---|---|---|---|
| GET | `/api/roles` | Sí | admin |
| GET | `/api/roles/:id` | Sí | admin |
| GET | `/api/roles/permisos` | Sí | — |
| POST | `/api/roles` | Sí | admin |
| PUT | `/api/roles/:id` | Sí | admin |
| PUT | `/api/roles/:id/permisos` | Sí | admin |
| DELETE | `/api/roles/:id` | Sí | admin |

### Empresa
| Método | Ruta | Auth | Permiso |
|---|---|---|---|
| GET | `/api/empresa` | Sí | — |
| GET | `/api/empresa/lista` | Sí | — |
| GET | `/api/empresa/:id` | Sí | — |
| POST | `/api/empresa` | Sí | config:update |
| PUT | `/api/empresa/:id` | Sí | config:update |
| DELETE | `/api/empresa/:id` | Sí | config:update |

### Plan de Cuentas
| Método | Ruta | Auth | Permiso |
|---|---|---|---|
| GET | `/api/plan-cuentas` | Sí | — |
| GET | `/api/plan-cuentas/siguiente-codigo` | Sí | — |
| GET | `/api/plan-cuentas/:id` | Sí | — |
| POST | `/api/plan-cuentas` | Sí | plan:create |
| PUT | `/api/plan-cuentas/:id` | Sí | plan:update |
| DELETE | `/api/plan-cuentas/:id` | Sí | plan:delete |

### Comprobantes
| Método | Ruta | Auth | Permiso |
|---|---|---|---|
| GET | `/api/comprobantes` | Sí | comprobantes:read |
| GET | `/api/comprobantes/:id` | Sí | comprobantes:read |
| GET | `/api/comprobantes/:comprobanteId/totales` | Sí | comprobantes:read |
| POST | `/api/comprobantes` | Sí | comprobantes:create |
| PUT | `/api/comprobantes/:id` | Sí | comprobantes:update |
| POST | `/api/comprobantes/:id/anular` | Sí | comprobantes:anular |
| DELETE | `/api/comprobantes/:id` | Sí | comprobantes:update |

### Gestiones
| Método | Ruta | Auth | Permiso |
|---|---|---|---|
| GET | `/api/gestiones` | Sí | — |
| GET | `/api/gestiones/actual` | Sí | — |
| GET | `/api/gestiones/:id` | Sí | — |
| POST | `/api/gestiones` | Sí | config:update |
| PUT | `/api/gestiones/:id` | Sí | config:update |
| POST | `/api/gestiones/:id/establecer-actual` | Sí | config:update |
| DELETE | `/api/gestiones/:id` | Sí | config:update |

### Proyectos
| Método | Ruta | Auth | Permiso |
|---|---|---|---|
| GET | `/api/proyectos` | Sí | — |
| GET | `/api/proyectos/:id` | Sí | — |
| POST | `/api/proyectos` | Sí | config:update |
| PUT | `/api/proyectos/:id` | Sí | config:update |
| DELETE | `/api/proyectos/:id` | Sí | config:update |

### Reportes
| Método | Ruta | Auth | Permiso |
|---|---|---|---|
| GET | `/api/reportes/libro-diario` | Sí | reportes:read |
| GET | `/api/reportes/libro-mayor` | Sí | reportes:read |
| GET | `/api/reportes/balance-general` | Sí | reportes:read |
| GET | `/api/reportes/estado-resultados` | Sí | reportes:read |
| GET | `/api/reportes/evolucion-patrimonio` | Sí | reportes:read |
| GET | `/api/reportes/sumas-saldos` | Sí | reportes:read |

### Exportación
| Método | Ruta | Auth | Permiso |
|---|---|---|---|
| GET | `/api/export/comprobante/:id/pdf` | Sí | reportes:export |
| GET | `/api/export/libro-diario/pdf` | Sí | reportes:export |
| GET | `/api/export/libro-diario/excel` | Sí | reportes:export |
| GET | `/api/export/libro-mayor/pdf` | Sí | reportes:export |
| GET | `/api/export/libro-mayor/excel` | Sí | reportes:export |
| GET | `/api/export/balance-general/pdf` | Sí | reportes:export |
| GET | `/api/export/balance-general/excel` | Sí | reportes:export |
| GET | `/api/export/estado-resultados/pdf` | Sí | reportes:export |
| GET | `/api/export/estado-resultados/excel` | Sí | reportes:export |
| GET | `/api/export/evolucion-patrimonio/pdf` | Sí | reportes:export |
| GET | `/api/export/evolucion-patrimonio/excel` | Sí | reportes:export |
| GET | `/api/export/sumas-saldos/pdf` | Sí | reportes:export |
| GET | `/api/export/sumas-saldos/excel` | Sí | reportes:export |

### Health
| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/api/health` | No | Health check |

---

## Resumen de Progreso

| Fase | Descripción | Estado | Archivos |
|---|---|---|---|
| **F1** | Fundación: Auth, Usuarios, Roles | ✅ Completa | 20+ archivos backend, 10+ frontend |
| **F2** | Core: Plan Cuentas, Comprobantes | ✅ Completa | 6 controllers, 4 routes, 3 páginas |
| **F3** | Reportes: 6 reportes contables | ✅ Completa | 1 controller, 1 route, 6 páginas |
| **F4** | Exportación PDF y Excel | ✅ Completa | 1 controller, 1 route, 6 páginas actualizadas |
| **F5** | Pulido UX | 🔄 En progreso | ConfirmModal, toasts, búsqueda, paginación |

**Total de líneas de código estimadas:** ~10,000+ líneas
**Total de archivos creados:** ~55 archivos
