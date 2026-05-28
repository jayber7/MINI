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
   - [Fase 5: Pulido UX y Módulos Adicionales](#fase-5-pulido-ux-y-módulos-adicionales)
7. [Guía de Uso](#guía-de-uso)
8. [Estructura de Archivos](#estructura-de-archivos)
9. [Endpoints API](#endpoints-api)

---

## Descripción del Proyecto

EICAP MINI es un sistema contable web que implementa las funcionalidades principales del sistema contable EICAP de escritorio (desarrollado en .NET Windows Forms con SQLite). El sistema permite:

- Gestión de usuarios, roles y permisos
- Plan de cuentas jerárquico (hasta 5 niveles + tipos Orden y Contingentes)
- Registro de comprobantes contables con validación de balance (debe == haber)
- Módulos de Compras, Ventas y Retenciones con auto-generación de asientos contables
- Generación de reportes contables: Libro Diario, Libro Mayor, Balance General, Estado de Resultados (con IUE 25%), Evolución del Patrimonio, Balance de Sumas y Saldos
- Filtro por gestión fiscal en todos los reportes
- Exportación a PDF y Excel
- Configuración de empresa con datos fiscales bolivianos (IVA, IUE, RC-IVA, IT)

**Credenciales por defecto:** `admin` / `admin123`
**Empresa seed:** Zapatería Elegante SRL con datos completos 2025–2026

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
- **Seed idempotente:** Los datos iniciales no se duplican al reiniciar

---

## Tecnologías

### Backend (`api/`)

| Tecnología | Versión | Propósito |
|---|---|---|
| Node.js | 20.x | Runtime |
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
Empresa (id, nombre, nit, direccion, telefono, firmas..., gestionActualId,
         ivaExento, ivaExentoRm, metodoEvaluacion, generarPdf)
    ↓
Gestion (id, year, glosa, fechaInicio, fechaFin, actividad, empresaId)
    ↓
PlanCuenta (id, codigo, nombre, nivel, padreId, tipo, clase, empresaId)
    ↓ (jerárquico: padreId → id)
PlanCuenta (hijos)

Proyecto (id, nombre, empresaId)

Comprobante (id, numero, tipoComprobante, glosa, fecha, estado, gestionId,
             empresaId, proyectoId, usuarioIdCrea, usuarioIdAnula,
             usuarioIdContabiliza, fechaContabilizacion,
             cheque, usd, ufv)
    ↓
ComprobanteDetalle (id, comprobanteId, planCuentaId, glosa, debe, haber)
    ↓
PlanCuenta

CuentaEspecifica (id, codigo, numero, nombre, empresaId)
Cotizacion (id, fecha, ufv, usd)
```

### Compras, Ventas y Retenciones

```
Compra (id, fecha, nit, razonSocial, numeroCompra, numeroDui,
        importeTotal, importeNoSujeto, descuentos, codigoControl,
        tipo, glosa, contabilizado, comprobanteId, empresaId)

Venta (id, fecha, nit, razonSocial, numeroVenta, numeroAutorizacion,
       importeTotal, importeExento, descuentos, codigoControl,
       tipo, glosa, contabilizado, comprobanteId, empresaId)

Retencion (id, fecha, tipoRetencion, porcentaje, montoBase, montoRetenido,
           agenteRetencion, glosa, contabilizado, comprobanteId, empresaId)
```

### Tipos de Comprobante
- `ingreso` — Comprobante de ingreso
- `egreso` — Comprobante de egreso
- `traspaso` — Comprobante de traspaso

### Estados de Comprobante
- `activo` — Comprobante vigente
- `anulado` — Comprobante anulado
- `contabilizado` — Comprobante contabilizado (no editable)

### Tipos de Cuenta
- `Activo` — Cuentas de activo
- `Pasivo` — Cuentas de pasivo
- `Patrimonio` — Cuentas de patrimonio
- `Ingreso` — Cuentas de ingreso
- `Gasto` — Cuentas de gasto
- `Orden` — Cuentas de orden
- `Contingente` — Cuentas contingentes

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
├── models/                     # 16 modelos con asociaciones
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
│   ├── Cotizacion.js
│   ├── Retencion.js
│   ├── Compra.js
│   └── Venta.js
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
│   ├── empresa.controller.js   # CRUD empresa
│   ├── plan.controller.js      # CRUD plan de cuentas
│   ├── comprobante.controller.js # CRUD + anular + contabilizar
│   ├── gestion.controller.js   # Gestión períodos fiscales
│   ├── proyecto.controller.js  # Centros de costo
│   ├── reporte.controller.js   # 6 reportes contables
│   ├── export.controller.js    # PDF y Excel
│   ├── retencion.controller.js # CRUD + contabilizar
│   ├── compra.controller.js    # CRUD + contabilizar
│   └── venta.controller.js     # CRUD + contabilizar
├── routes/
│   ├── index.js                # Agregador de rutas
│   └── ...                     # 13 archivos de rutas
├── seeds/
│   ├── seed.js                 # Permisos, roles, admin, empresa base
│   └── seedZapateria.js        # Datos completos Zapatería Elegante SRL
└── index.js                    # Entry point Express (sirve estáticos en prod)
```

**Endpoints implementados:**

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
- 20 permisos organizados por módulo (incluye `comprobantes:contabilizar`)
- 3 roles: admin (todos), contador (sin gestión usuarios/roles), auxiliar (lectura + comprobantes)
- Usuario admin: `admin` / `admin123`
- Empresa: "Zapatería Elegante SRL" con NIT 5012345678
- Gestiones fiscales 2025 y 2026
- Plan de cuentas con 80 cuentas jerárquicas (7 tipos)

#### Frontend

**Estructura creada:**
```
client/src/
├── context/
│   └── AuthContext.jsx         # AuthProvider, login, logout, tienePermiso, tieneRol
├── services/
│   └── api.js                  # Axios instance con interceptors JWT + exportarArchivo
├── components/
│   ├── Layout.jsx              # Sidebar responsive con menú dinámico
│   ├── ProtectedRoute.jsx      # Ruta protegida con verificación de permisos
│   └── ConfirmModal.jsx        # Modal reutilizable para acciones destructivas
├── pages/
│   ├── Login.jsx
│   ├── Dashboard.jsx
│   ├── Usuarios.jsx
│   ├── Roles.jsx
│   ├── PlanCuentas.jsx
│   ├── Comprobantes.jsx
│   ├── Configuracion.jsx
│   ├── LibroDiario.jsx
│   ├── LibroMayor.jsx
│   ├── BalanceGeneral.jsx
│   ├── EstadoResultados.jsx
│   ├── EvolucionPatrimonio.jsx
│   ├── SumasSaldos.jsx
│   ├── Retenciones.jsx
│   ├── Compras.jsx
│   └── Ventas.jsx
└── App.jsx                     # Router principal con rutas protegidas
```

**Características:**
- React Router con rutas protegidas por permisos
- AuthContext con login/logout/verificación de permisos
- Sidebar responsive con 15+ items de menú
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
| `comprobante.controller.js` | listar, obtener, crear, actualizar, anular, contabilizar, eliminar, obtenerTotales | CRUD comprobantes con **validación de balance** |
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
- `POST /api/comprobantes/:id/contabilizar` — Contabilizar comprobante (permiso: comprobantes:contabilizar)
- `DELETE /api/comprobantes/:id` — Eliminar comprobante (permiso: comprobantes:update)
- `GET /api/gestiones` — Lista gestiones
- `GET /api/gestiones/actual` — Gestión actual
- `GET /api/proyectos` — Lista proyectos

**Reglas de negocio implementadas:**
- **Validación de balance:** Al crear/editar un comprobante, verifica que `suma(debe) == suma(haber)` con tolerancia de 0.01
- **Numeración automática:** Si no se proporciona número, genera el siguiente correlativo por gestión
- **Estado obligatorio:** Solo comprobantes `activo` pueden editarse o eliminarse
- **Anulación:** Mantiene registro pero marca como `anulado`, registra usuario y fecha de anulación
- **Contabilización:** Transición `activo` → `contabilizado`, registra usuario y fecha, bloquea edición/eliminación
- **Protección de hijos:** No se puede eliminar una cuenta del plan que tenga cuentas hijas

#### Frontend

**Páginas implementadas:**

| Página | Características |
|---|---|
| **Plan de Cuentas** | Vista en árbol expandible, colores por tipo (7 tipos), CRUD inline, generación de código, búsqueda por código/nombre, leyenda de tipos |
| **Comprobantes** | Lista con filtros (fecha, tipo, estado, búsqueda), formulario con líneas dinámicas, validación de balance en tiempo real, campos cheque/USD/UFV, botones: editar/anular/eliminar/contabilizar/exportar PDF, badges de estado (activo/contabilizado/anulado), cálculos rápidos fiscales (87%, IVA 13%, IT 3%, RC-IVA 8%/15.5%) |
| **Configuración** | Formulario completo de empresa con datos generales, firmas para reportes, configuración IVA exento, método de evaluación |

---

### Fase 3: Reportes Contables

**Estado:** ✅ COMPLETADA

#### Backend

**Controller:** `reporte.controller.js`

| Endpoint | Descripción | Lógica |
|---|---|---|
| `GET /api/reportes/libro-diario` | Lista comprobantes con detalles | Filtra por estado=activo, rango de fechas, proyecto. Agrupa por comprobante con totales debe/haber |
| `GET /api/reportes/libro-mayor` | Movimientos por cuenta con saldos | Consulta Comprobante → agrupa por cuenta. Saldo: Activo/Gasto=debe-haber, Pasivo/Patrimonio/Ingreso=haber-debe |
| `GET /api/reportes/balance-general` | Activo = Pasivo + Patrimonio | Filtra cuentas por tipo, calcula saldos, incluye utilidad del ejercicio en patrimonio |
| `GET /api/reportes/estado-resultados` | Ingresos - Gastos = Utilidad | Calcula totales de ingresos y gastos, aplica IUE 25%, retorna utilidad neta |
| `GET /api/reportes/evolucion-patrimonio` | Patrimonio inicial + utilidad = final | Calcula patrimonio actual + utilidad del ejercicio |
| `GET /api/reportes/sumas-saldos` | Suma debe/haber + saldos por cuenta | Calcula sumas y saldos deudor/acreedor con totales generales |

**Funciones auxiliares:**
- `resolverFechas(desde, hasta, gestionId)` — Resuelve fechas desde gestión fiscal o usa las proporcionadas
- `aplicarRollUp(cuentas, campoSaldo)` — Roll-up jerárquico de saldos por código de cuenta
- `calcularPorTipo(tipo, desde, hasta)` — Calcula saldos de cuentas por tipo
- `calcularUtilidad(desde, hasta)` — Calcula utilidad del ejercicio (ingresos - gastos)

#### Frontend

**Páginas implementadas:**

| Página | Características |
|---|---|
| **Libro Diario** | Comprobantes agrupados con detalles expandibles, totales por comprobante, selector de gestión, filtros por fecha |
| **Libro Mayor** | Tarjetas por cuenta con movimientos, saldo corriente, totales, filtro por cuenta específica, selector de gestión |
| **Balance General** | Dos columnas (Activo vs Pasivo+Patrimonio), verificación de ecuación contable con indicador visual ✓/✗, selector de gestión |
| **Estado de Resultados** | Ingresos (azul) - Gastos (naranja) = Utilidad/Pérdida (verde/rojo), IUE 25% automático, selector de gestión |
| **Evolución del Patrimonio** | Patrimonio inicial + utilidad del ejercicio = patrimonio final, selector de gestión |
| **Sumas y Saldos** | Tabla 6 columnas con totales, indentación jerárquica, saldos deudor/acreedor, selector de gestión |

**Características comunes:**
- Selector de gestión fiscal que auto-popula fechas (pero permite ajuste manual)
- Formato Bs. con separadores de miles
- Colores por tipo de cuenta
- Indentación jerárquica por nivel
- Botones de exportar PDF y Excel
- Estados de carga y mensajes cuando no hay datos

---

### Fase 4: Exportación PDF y Excel

**Estado:** ✅ COMPLETADA

#### Backend

**Controller:** `export.controller.js`

| Función | Descripción |
|---|---|
| `exportarComprobantePDF` | PDF individual de comprobante con encabezado empresa, líneas detalladas, totales, cheque/USD/UFV y firmas |
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
- Filtros de fecha y gestionId se pasan como parámetros query a las rutas de exportación

---

### Fase 5: Pulido UX y Módulos Adicionales

**Estado:** ✅ COMPLETADA

#### Implementado

- **Notificaciones toast** — `react-hot-toast` instalado, todos los `alert()` reemplazados por toasts
- **Modales de confirmación** — Componente `ConfirmModal.jsx` reutilizable (danger/warning/info variants)
- **Búsqueda** — Campo de búsqueda en Plan de Cuentas (código/nombre) y Comprobantes (Nº/glosa/usuario)
- **Paginación** — En lista de comprobantes (10 por página con controles de navegación)
- **Selector de gestión fiscal** — En las 6 páginas de reportes, auto-popula fechas desde la tabla Gestion
- **Campos adicionales en Comprobante** — `cheque`, `usd`, `ufv`, `usuarioIdContabiliza`, `fechaContabilizacion`
- **Botón Contabilizar** — En lista de comprobantes, transición a estado `contabilizado` con confirmación
- **Exportar PDF individual** — Botón en cada comprobante de la lista
- **Filtro estado "Contabilizado"** — En filtros de comprobantes
- **Servir frontend estático en producción** — Express sirve `client/dist/` cuando `NODE_ENV=production`

#### Módulos Compras, Ventas y Retenciones

| Módulo | Endpoints | Auto-contabilización |
|---|---|---|
| **Compras** | CRUD + `POST /:id/contabilizar` | Genera comprobante egreso con Crédito Fiscal IVA (13%), costo neto (87%), cuenta por pagar |
| **Ventas** | CRUD + `POST /:id/contabilizar` | Genera comprobante ingreso con Débito Fiscal IVA, IT 3%, venta neta |
| **Retenciones** | CRUD + `POST /:id/contabilizar` | Genera comprobante egreso con cuenta de retención correspondiente |

**Seed de datos:** `seedZapateria.js` crea registros Compra y Venta que generan automáticamente sus comprobantes vinculados (`contabilizado: true`, `comprobanteId` referenciado).

**Datos sembrados:**
- 18 compras (12 en 2025, 6 en 2026)
- 28 ventas (23 en 2025, 5 en 2026)
- 84 comprobantes totales (auto-generados + directos)
- 276 líneas de detalle

---

## Guía de Uso

### Requisitos

- Node.js 20+ (requerido por Vite 8)
- npm (gestor de paquetes)

### Instalación y Ejecución

#### Desarrollo (dos procesos)

```bash
# Terminal 1 - Backend
cd api
npm install
npm run dev
# Servidor corriendo en http://localhost:3001

# Terminal 2 - Frontend
cd client
npm install
npx vite
# App corriendo en http://localhost:5173
```

#### Producción (un solo proceso)

```powershell
# 1. Instalar dependencias
cd api && npm install
cd ..\client && npm install

# 2. Construir frontend
npm run build

# 3. Configurar .env para producción
cd ..\api
# Editar .env: NODE_ENV=production, JWT_SECRET=<clave_segura>

# 4. Iniciar (sirve API + frontend en un solo puerto)
npm start
```

Todo accesible en `http://localhost:3001`.

### Primer Uso

1. Abrir `http://localhost:5173` (dev) o `http://localhost:3001` (prod)
2. Iniciar sesión con `admin` / `admin123`
3. Ir a **Configuración** y actualizar datos de la empresa
4. Ir a **Plan de Cuentas** para revisar/agregar cuentas
5. Ir a **Comprobantes** → **Nuevo Comprobante** para registrar movimientos
6. O usar módulos **Compras/Ventas/Retenciones** para registro con auto-asiento
7. Generar reportes desde el menú lateral, seleccionando la gestión fiscal

### Roles y Permisos

| Acción | Admin | Contador | Auxiliar |
|---|---|---|---|
| Ver Dashboard | ✓ | ✓ | ✓ |
| Plan de Cuentas (ver) | ✓ | ✓ | ✓ |
| Plan de Cuentas (crear/editar/eliminar) | ✓ | ✓ | ✗ |
| Comprobantes (ver) | ✓ | ✓ | ✓ |
| Comprobantes (crear/editar) | ✓ | ✓ | ✓ |
| Comprobantes (anular/contabilizar) | ✓ | ✓ | ✗ |
| Compras/Ventas/Retenciones | ✓ | ✓ | ✓ |
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
│       ├── index.js                  # Entry point (sirve estáticos en prod)
│       ├── config/
│       │   └── database.js           # Conexión Sequelize
│       ├── models/                   # 16 modelos Sequelize
│       ├── controllers/              # 13 controllers
│       ├── services/                 # auth.service.js
│       ├── middleware/               # auth, roles, errorHandler
│       ├── routes/                   # 13 archivos de rutas
│       └── seeds/
│           ├── seed.js               # Permisos, roles, admin, empresa base
│           └── seedZapateria.js      # Datos completos Zapatería Elegante SRL
│
├── client/                           # Frontend React
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── dist/                         # Build de producción
│   └── src/
│       ├── main.jsx                  # Entry point
│       ├── App.jsx                   # Router principal
│       ├── index.css                 # Tailwind import
│       ├── context/
│       │   └── AuthContext.jsx       # Auth provider
│       ├── services/
│       │   └── api.js                # Axios instance + exportarArchivo
│       ├── components/
│       │   ├── Layout.jsx            # Sidebar + header
│       │   ├── ProtectedRoute.jsx    # Route guard
│       │   └── ConfirmModal.jsx      # Modal de confirmación
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
│           ├── SumasSaldos.jsx
│           ├── Retenciones.jsx
│           ├── Compras.jsx
│           └── Ventas.jsx
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
| POST | `/api/comprobantes/:id/contabilizar` | Sí | comprobantes:contabilizar |
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

### Compras
| Método | Ruta | Auth | Permiso |
|---|---|---|---|
| GET | `/api/compras` | Sí | — |
| GET | `/api/compras/:id` | Sí | — |
| POST | `/api/compras` | Sí | — |
| PUT | `/api/compras/:id` | Sí | — |
| DELETE | `/api/compras/:id` | Sí | — |
| POST | `/api/compras/:id/contabilizar` | Sí | — |

### Ventas
| Método | Ruta | Auth | Permiso |
|---|---|---|---|
| GET | `/api/ventas` | Sí | — |
| GET | `/api/ventas/:id` | Sí | — |
| POST | `/api/ventas` | Sí | — |
| PUT | `/api/ventas/:id` | Sí | — |
| DELETE | `/api/ventas/:id` | Sí | — |
| POST | `/api/ventas/:id/contabilizar` | Sí | — |

### Retenciones
| Método | Ruta | Auth | Permiso |
|---|---|---|---|
| GET | `/api/retenciones` | Sí | — |
| GET | `/api/retenciones/:id` | Sí | — |
| POST | `/api/retenciones` | Sí | — |
| PUT | `/api/retenciones/:id` | Sí | — |
| DELETE | `/api/retenciones/:id` | Sí | — |
| POST | `/api/retenciones/:id/contabilizar` | Sí | — |

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

## Notas Técnicas Importantes

### Sequelize y PlanCuenta
Sequelize singulariza `PlanCuenta` como `PlanCuentum` (estilo latín). Al hacer `include` de `PlanCuenta` en queries, los datos asociados se acceden como `detalle.PlanCuentum`, no `detalle.PlanCuenta`. Esto aplica en `reporte.controller.js` para Libro Diario y Libro Mayor.

### Seed Idempotente
El seed base (`seed.js`) usa `findOrCreate` para todos los registros, permitiendo ejecución segura al reiniciar el servidor sin errores de duplicados. El seed de Zapatería (`seedZapateria.js`) verifica existencia de gestión 2025 antes de ejecutar.

### SQLite y ALTER TABLE
SQLite no soporta `ALTER TABLE ADD COLUMN` automáticamente con Sequelize `sync()`. Si se agregan campos nuevos a un modelo existente, ejecutar manualmente:
```sql
ALTER TABLE tabla ADD COLUMN nombre tipo;
```

### Despliegue en Producción
- `NODE_ENV=production` en `.env` activa el serving de archivos estáticos desde `client/dist/`
- El frontend debe construirse primero con `npm run build`
- Un solo proceso Node.js sirve tanto API como SPA

---

## Resumen de Progreso

| Fase | Descripción | Estado | Archivos |
|---|---|---|---|
| **F1** | Fundación: Auth, Usuarios, Roles | ✅ Completa | 20+ archivos backend, 10+ frontend |
| **F2** | Core: Plan Cuentas, Comprobantes | ✅ Completa | 6 controllers, 4 routes, 3 páginas |
| **F3** | Reportes: 6 reportes contables | ✅ Completa | 1 controller, 1 route, 6 páginas |
| **F4** | Exportación PDF y Excel | ✅ Completa | 1 controller, 1 route, 6 páginas actualizadas |
| **F5** | Multi-empresa + Dashboard + Inventario + Clientes/Prov | ✅ Completa | ~120 archivos backend+frontend |

**Total de líneas de código estimadas:** ~25,000+ líneas
**Total de archivos creados:** ~100+ archivos

### Empresas Disponibles
1. **Mi Empresa Académica** — Empresa legada (80 cuentas plan de cuentas, datos Zapatería)
2. **CENTRO DE DISTRIBUCIÓN ORURO** — Distribuidora de bebidas (sin plan de cuentas aún, importar desde Excel)
3. **ENALBO S.A.** — Fabricante de envases de aluminio (44 cuentas plan de cuentas sembrado, datos de inventario)

### Características Clave Implementadas (Fase Multi-empresa)
- Modelos: ClienteProveedor, Producto, MovimientoInventario
- PlanCuenta con `clasificacionFlujo` y unique compuesto `[codigo, empresaId]`
- Selector de empresa en header (sidebar local storage)
- Dashboard: 5 KPIs, charts (line+donut), tablas (últimas ventas, resumen financiero, productos más vendidos), alertas
- Comprobantes: detalle en panel derecho, filtros por tipo documento/estado/pago
- Balance General con gráfico pastel (Activo/Pasivo/Patrimonio)
- Estado Resultados en dos columnas (Ingresos/Gastos)
- Evolución Patrimonio con items específicos
- Flujo de Efectivo (3 clasificaciones: operación/inversión/financiamiento)
- CSV import endpoint para clientes/proveedores (`POST /api/clientes-proveedores/importar-csv`)
- Importar Excel plan de cuentas (`POST /api/plan-cuentas/importar-excel`)
- Export PDF comprobantes con números de cuenta y tabla con borde
- Middleware empresa (x-empresa-id header)
- Dashboard endpoint `GET /api/dashboard`
