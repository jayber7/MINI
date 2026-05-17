# Reporte de Análisis: EICAP MINI - Sistema Contable

## 1. INFORMACIÓN GENERAL

| Aspecto | Detalle |
|---------|---------|
| **Nombre** | EICAP MINI - Sistema Contable |
| **Tipo** | Sistema de contabilidad completo (full-stack) |
| **Arquitectura** | Monorepo: Backend (Express.js) + Frontend (React) |
| **Backend** | Node.js + Express.js 5.x |
| **Frontend** | React 19.x + Vite 8.x + Tailwind CSS 4.x |
| **ORM** | Sequelize 6.x |
| **Base de Datos** | SQLite (archivo `database.sqlite`) |
| **Autenticación** | JWT (jsonwebtoken) + bcryptjs |
| **Exportación** | PDF (pdfkit) + Excel (exceljs) |
| **Localización** | Bolivia (Bs., NIT, UFV, SIAT) |

---

## 2. CARACTERÍSTICAS PRINCIPALES

### 2.1 Gestión de Usuarios y Seguridad
- **RBAC (Role-Based Access Control)**: 3 roles predefinidos (admin, contador, auxiliar)
- **19 permisos** granulares organizados por módulos
- **Autenticación JWT** con tokens de acceso
- **Hash de contraseñas** con bcryptjs (10 rounds)
- **Middleware de autorización** que valida rol y permisos por ruta

### 2.2 Plan de Cuentas
- **Estructura jerárquica** de hasta 3 niveles (padre-hijo autoreferencial)
- **5 tipos de cuenta**: Activo, Pasivo, Patrimonio, Ingreso, Gasto
- **Clasificación contable**: Real (balance) vs Nominal (resultados)
- **Integración SIAT**: campos `codigoSiat` y `cuentaSiat` para normativa boliviana
- **31 cuentas precargadas** en el seed inicial

### 2.3 Comprobantes Contables
- **3 tipos**: Ingreso, Egreso, Traspaso
- **3 estados**: Activo, Anulado, Contabilizado
- **Validación de partida doble**: DEBE = HABER (tolerancia ±0.01)
- **Auto-numeração** secuencial por gestión
- **Auditoría**: registra quién crea y quién anula, con fechas
- **Vinculación** a gestión fiscal, proyecto y empresa

### 2.4 Reportes Financieros (6 reportes)
1. **Libro Diario**: Registro cronológico de todos los comprobantes
2. **Libro Mayor**: Movimientos agrupados por cuenta con saldos acumulados
3. **Balance General**: Activo = Pasivo + Patrimonio (con verificación de ecuación contable)
4. **Estado de Resultados**: Ingresos - Gastos = Utilidad/Pérdida neta
5. **Evolución del Patrimonio**: Patrimonio inicial + utilidad del ejercicio
6. **Sumas y Saldos**: Suma de débitos/créditos + saldos deudores/acreedores

### 2.5 Exportación
- **PDF**: Con encabezado corporativo, tablas formateadas y firmas
- **Excel**: Con formato numérico, negritas y colores

### 2.6 Configuración Empresarial
- Datos de empresa (nombre, NIT, dirección, teléfono)
- Firmas configurables (Contador, Propietario, Representante Legal)
- Gestión fiscal con fechas de inicio/fin
- Cotizaciones de moneda (UFV y USD)

---

## 3. BASE DE DATOS

### 3.1 Motor: SQLite
- **Archivo**: `api/src/database.sqlite`
- **Configuración**: `api/src/config/database.js`

```javascript
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '..', 'database.sqlite'),
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
});
```

### 3.2 Tablas (12 modelos)

| Tabla | Descripción | Campos Clave |
|-------|-------------|--------------|
| `usuarios` | Usuarios del sistema | id, username, email, password (hash), nombreCompleto, rolId, activo |
| `roles` | Roles de usuario | id, nombre, descripcion |
| `permisos` | Permisos del sistema | id, nombre, codigo, modulo |
| `rol_permisos` | Relación rol-permiso | rolId, permisoId |
| `empresas` | Datos de la empresa | id, nombre, nit, direccion, telefono, gestionActualId, firmas |
| `gestiones` | Gestiones fiscales | id, year, fechaInicio, fechaFin, actividad, empresaId |
| `plan_cuentas` | Plan de cuentas | id, codigo, nombre, nivel, padreId, tipo, clase, codigoSiat, empresaId |
| `proyectos` | Proyectos | id, nombre, empresaId |
| `comprobantes` | Comprobantes contables | id, numero, tipoComprobante, glosa, fecha, estado, gestionId, empresaId, proyectoId, usuarioIdCrea, usuarioIdAnula |
| `comprobantes_detalles` | Líneas de comprobante | id, comprobanteId, planCuentaId, glosa, debe (DECIMAL 14,2), haber (DECIMAL 14,2) |
| `cuentas_especificas` | Cuentas específicas | id, codigo, numero, nombre, empresaId |
| `cotizaciones` | Tipos de cambio | id, fecha, ufv (DECIMAL 10,4), usd (DECIMAL 10,4) |

### 3.3 Relaciones Principales

```
Empresa 1──N Gestion
Empresa 1──N PlanCuenta
Empresa 1──N Proyecto
Empresa 1──N Comprobante
PlanCuenta (padre) 1──N PlanCuenta (hijo) [autoreferencial]
Gestion 1──N Comprobante
Proyecto 1──N Comprobante
Usuario 1──N Comprobante (crea)
Usuario 1──N Comprobante (anula)
Comprobante 1──N ComprobanteDetalle
PlanCuenta 1──N ComprobanteDetalle
Rol N──N Permiso (via RolPermiso)
Rol 1──N Usuario
```

### 3.4 Datos Iniciales (Seed)

**Roles:**
- `admin` → Todos los 19 permisos
- `contador` → Todos excepto gestión de usuarios, roles y configuración
- `auxiliar` → plan:read, comprobantes (read/create/update), reportes (read/export)

**Usuario por defecto:**
- Username: `admin` / Password: `admin123`

**Plan de cuentas precargado (31 cuentas):**
```
1       Activo                    (Nivel 1, Real)
1.1     Activo Corriente          (Nivel 2, Real)
1.1.1   Caja                      (Nivel 3, Real)
1.1.2   Bancos                    (Nivel 3, Real)
1.1.3   Inventarios               (Nivel 3, Real)
1.1.4   Cuentas por Cobrar        (Nivel 3, Real)
1.2     Activo No Corriente       (Nivel 2, Real)
1.2.1   Mobiliario y Equipo       (Nivel 3, Real)
1.2.2   Vehículos                 (Nivel 3, Real)
1.2.3   Terrenos                  (Nivel 3, Real)
2       Pasivo                    (Nivel 1, Real)
2.1     Pasivo Corriente          (Nivel 2, Real)
2.1.1   Cuentas por Pagar         (Nivel 3, Real)
2.1.2   Sueldos por Pagar         (Nivel 3, Real)
2.1.3   Impuestos por Pagar       (Nivel 3, Real)
2.2     Pasivo No Corriente       (Nivel 2, Real)
2.2.1   Préstamos Bancarios L/P   (Nivel 3, Real)
3       Patrimonio                (Nivel 1, Real)
3.1     Capital Social            (Nivel 2, Real)
3.2     Utilidades Retenidas      (Nivel 2, Real)
3.3     Resultado del Ejercicio   (Nivel 2, Real)
4       Ingresos                  (Nivel 1, Nominal)
4.1     Ingresos por Ventas       (Nivel 2, Nominal)
4.1.1   Ventas de Mercadería      (Nivel 3, Nominal)
4.1.2   Ventas de Servicios       (Nivel 3, Nominal)
4.2     Otros Ingresos            (Nivel 2, Nominal)
5       Gastos                    (Nivel 1, Nominal)
5.1     Costo de Ventas           (Nivel 2, Nominal)
5.1.1   Compras de Mercadería     (Nivel 3, Nominal)
5.2     Gastos de Operación       (Nivel 2, Nominal)
5.2.1   Sueldos y Salarios        (Nivel 3, Nominal)
5.2.2   Alquileres                (Nivel 3, Nominal)
5.2.3   Servicios Básicos         (Nivel 3, Nominal)
5.2.4   Depreciación              (Nivel 3, Nominal)
5.2.5   Gastos Administrativos    (Nivel 3, Nominal)
```

---

## 4. MOTOR DE CÁLCULOS CONTABLES

### 4.1 Motor de Partida Doble (Validación de Comprobantes)

**Archivo**: `api/src/controllers/comprobante.controller.js`

Este es el **corazón del sistema contable**. Valida que cada comprobante cumpla el principio fundamental de la contabilidad:

```javascript
// Líneas 73-92: Validación de partida doble al CREAR
let totalDebe = 0;
let totalHaber = 0;

detalles.forEach((d) => {
  totalDebe += parseFloat(d.debe) || 0;
  totalHaber += parseFloat(d.haber) || 0;
});

const diferencia = Math.abs(totalDebe - totalHaber);

if (diferencia > 0.01) {
  return res.status(400).json({
    error: 'El comprobante no está balanceado',
    detalles: {
      totalDebe: totalDebe.toFixed(2),
      totalHaber: totalHaber.toFixed(2),
      diferencia: diferencia.toFixed(2),
    },
  });
}
```

**Lógica**: Suma todos los débitos y créditos del comprobante. Si la diferencia absoluta es mayor a 0.01 (tolerancia por redondeo), rechaza el comprobante.

### 4.2 Motor de Saldos por Tipo de Cuenta

**Archivo**: `api/src/controllers/reporte.controller.js`

El sistema calcula saldos de forma **diferenciada según el tipo de cuenta**, aplicando las reglas contables correctas:

```javascript
// Líneas 135-139: Libro Mayor - Cálculo de saldo por tipo
if (cuentasMap[codigo].tipo === 'Activo' || cuentasMap[codigo].tipo === 'Gasto') {
  cuentasMap[codigo].saldo += debe - haber;  // Saldo deudor
} else {
  cuentasMap[codigo].saldo += haber - debe;  // Saldo acreedor (Pasivo, Patrimonio, Ingreso)
}
```

**Regla contable**:
- **Activo y Gasto**: Saldo = DEBE - HABER (naturalmente deudor)
- **Pasivo, Patrimonio e Ingreso**: Saldo = HABER - DEBE (naturalmente acreedor)

### 4.3 Motor del Balance General

**Archivo**: `api/src/controllers/reporte.controller.js` (líneas 156-227)

Calcula la ecuación contable fundamental y verifica que cuadre:

```javascript
// Líneas 198-221: Clasificación y cálculo de saldos
const saldo = cuenta.tipo === 'Activo'
  ? debeTotal - haberTotal   // Activo: saldo deudor
  : haberTotal - debeTotal;  // Pasivo/Patrimonio: saldo acreedor

if (cuenta.tipo === 'Activo') {
  resultado.activo.cuentas.push(item);
  resultado.activo.total += saldo;
} else if (cuenta.tipo === 'Pasivo') {
  resultado.pasivo.cuentas.push(item);
  resultado.pasivo.total += saldo;
} else if (cuenta.tipo === 'Patrimonio') {
  resultado.patrimonio.cuentas.push(item);
  resultado.patrimonio.total += saldo;
}

// Línea 223-224: Cálculo de utilidad e integración al patrimonio
resultado.utilidadEjercicio = await calcularUtilidad(desde, hasta);
resultado.patrimonio.total += resultado.utilidadEjercicio;
```

### 4.4 Motor del Estado de Resultados

**Archivo**: `api/src/controllers/reporte.controller.js` (líneas 240-252)

```javascript
async function obtenerEstadoResultados(desde, hasta) {
  const ingresos = await calcularPorTipo('Ingreso', desde, hasta);
  const gastos = await calcularPorTipo('Gasto', desde, hasta);

  const totalIngresos = ingresos.reduce((sum, c) => sum + c.saldo, 0);
  const totalGastos = gastos.reduce((sum, c) => sum + c.saldo, 0);

  return {
    ingresos: { total: totalIngresos, cuentas: ingresos },
    gastos: { total: totalGastos, cuentas: gastos },
    utilidad: totalIngresos - totalGastos,
  };
}
```

### 4.5 Motor de Utilidad del Ejercicio

**Archivo**: `api/src/controllers/reporte.controller.js` (líneas 441-449)

```javascript
async function calcularUtilidad(desde, hasta) {
  const ingresos = await calcularPorTipo('Ingreso', desde, hasta);
  const gastos = await calcularPorTipo('Gasto', desde, hasta);

  const totalIngresos = ingresos.reduce((sum, c) => sum + c.saldo, 0);
  const totalGastos = gastos.reduce((sum, c) => sum + c.saldo, 0);

  return totalIngresos - totalGastos;
}
```

### 4.6 Motor de Sumas y Saldos

**Archivo**: `api/src/controllers/reporte.controller.js` (líneas 290-376)

Calcula 4 columnas por cuenta: suma debe, suma haber, saldo deudor, saldo acreedor.

```javascript
// Líneas 332-347: Lógica de saldo deudor vs acreedor
if (cuenta.tipo === 'Activo' || cuenta.tipo === 'Gasto') {
  saldoDeudor = sumaDebe - sumaHaber;
  if (saldoDeudor < 0) {
    saldoAcreedor = Math.abs(saldoDeudor);
    saldoDeudor = 0;  // Un activo no puede tener saldo deudor negativo
  }
} else {
  saldoAcreedor = sumaHaber - sumaDebe;
  if (saldoAcreedor < 0) {
    saldoDeudor = Math.abs(saldoAcreedor);
    saldoAcreedor = 0;  // Un pasivo no puede tener saldo acreedor negativo
  }
}
```

### 4.7 Motor de Cálculo por Tipo (Función Genérica)

**Archivo**: `api/src/controllers/reporte.controller.js` (líneas 389-439)

Función reutilizable que alimenta múltiples reportes:

```javascript
async function calcularPorTipo(tipo, desde, hasta) {
  const cuentas = await PlanCuenta.findAll({
    where: { tipo },
    include: [{
      model: ComprobanteDetalle,
      include: [{ model: Comprobante, where, attributes: [] }],
      attributes: ['debe', 'haber'],
    }],
    order: [['codigo', 'ASC']],
  });

  return cuentas.map((cuenta) => {
    let debeTotal = 0;
    let haberTotal = 0;

    cuenta.ComprobanteDetalles.forEach((d) => {
      debeTotal += parseFloat(d.debe) || 0;
      haberTotal += parseFloat(d.haber) || 0;
    });

    // Ingresos: saldo = haber - debe (acreedor)
    // Gastos: saldo = debe - haber (deudor)
    const saldo = tipo === 'Ingreso' ? haberTotal - debeTotal : debeTotal - haberTotal;

    return { codigo: cuenta.codigo, nombre: cuenta.nombre, nivel: cuenta.nivel, saldo };
  }).filter(Boolean);
}
```

### 4.8 Validación Frontend de Partida Doble

**Archivo**: `client/src/pages/Comprobantes.jsx` (líneas 105-113)

```javascript
const calcularTotales = () => {
  let totalDebe = 0;
  let totalHaber = 0;
  form.detalles.forEach((d) => {
    totalDebe += parseFloat(d.debe) || 0;
    totalHaber += parseFloat(d.haber) || 0;
  });
  return { totalDebe, totalHaber, balanceado: Math.abs(totalDebe - totalHaber) < 0.01 };
};
```

**Mutual exclusión DEBE/HABER** (líneas 94-99):
```javascript
if (campo === 'debe' && parseFloat(valor) > 0) {
  nuevosDetalles[index].haber = 0;  // Si escribe en DEBE, limpia HABER
}
if (campo === 'haber' && parseFloat(valor) > 0) {
  nuevosDetalles[index].debe = 0;   // Si escribe en HABER, limpia DEBE
}
```

### 4.9 Verificación de Ecuación Contable (Frontend)

**Archivo**: `client/src/pages/BalanceGeneral.jsx` (líneas 62-63)

```javascript
const totalPasivoPatrimonio = datos.pasivo.total + datos.patrimonio.total;
const balanceado = Math.abs(datos.activo.total - totalPasivoPatrimonio) < 0.01;
```

Verifica: **Activo = Pasivo + Patrimonio**

---

## 5. FRAGMENTOS DE CÓDIGO DESTACADOS

### 5.1 Motor de Autenticación JWT

**Archivo**: `api/src/middleware/auth.js`

```javascript
const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Token no proporcionado' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.usuario = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Token inválido' });
  }
};
```

### 5.2 Middleware de Permisos

**Archivo**: `api/src/middleware/roles.js`

```javascript
module.exports = (permisoRequerido) => {
  return async (req, res, next) => {
    const usuario = await Usuario.findByPk(req.usuario.id, {
      include: [{ model: Rol, include: [{ model: Permiso }] }],
    });

    const permisos = usuario.Rol.Permisos.map(p => p.codigo);
    if (!permisos.includes(permisoRequerido)) {
      return res.status(403).json({ error: 'No tiene permisos suficientes' });
    }
    next();
  };
};
```

### 5.3 Modelo de ComprobanteDetalle (Precisión Decimal)

**Archivo**: `api/src/models/ComprobanteDetalle.js`

```javascript
debe: {
  type: DataTypes.DECIMAL(14, 2),  // Hasta 999,999,999,999.99
  allowNull: false,
  defaultValue: 0,
},
haber: {
  type: DataTypes.DECIMAL(14, 2),
  allowNull: false,
  defaultValue: 0,
},
```

### 5.4 Formato de Moneda Boliviana

**Archivo**: `api/src/controllers/export.controller.js` (línea 50-52)

```javascript
function formatBs(n) {
  return `Bs. ${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}
```

### 5.5 Generación de PDF con Firmas

**Archivo**: `api/src/controllers/export.controller.js` (líneas 17-48)

```javascript
function configurarPiePDF(doc, empresa) {
  const firmas = [
    { titulo: empresa?.tituloContador || '', nombre: empresa?.firmaContador || '' },
    { titulo: empresa?.tituloPropietario || '', nombre: empresa?.firmaPropietario || '' },
    { titulo: empresa?.tituloRepresentanteLegal || '', nombre: empresa?.firmaRepresentanteLegal || '' },
  ].filter(f => f.nombre || f.titulo);

  if (firmas.length > 0) {
    const y = doc.page.height - 100;
    const startX = 50;
    const width = 150;

    firmas.forEach((f, i) => {
      const x = startX + i * (width + 50);
      doc.strokeColor('#000000').lineWidth(0.5)
        .moveTo(x, y).lineTo(x + width, y).stroke();
      doc.fontSize(8).font('Helvetica-Bold').text(f.nombre || '', { align: 'center', width });
      doc.fontSize(7).font('Helvetica').text(f.titulo || '', { align: 'center', width });
    });
  }
}
```

### 5.6 Plan de Cuentas Jerárquico

**Archivo**: `api/src/models/index.js` (líneas 31-33)

```javascript
// PlanCuenta jerárquica (padre-hijo)
PlanCuenta.belongsTo(PlanCuenta, { as: 'padre', foreignKey: 'padreId' });
PlanCuenta.hasMany(PlanCuenta, { as: 'hijos', foreignKey: 'padreId' });
```

### 5.7 Auto-numeración de Comprobantes

**Archivo**: `api/src/controllers/comprobante.controller.js` (líneas 254-261)

```javascript
async function obtenerSiguienteNumero(gestionId) {
  const ultimo = await Comprobante.findOne({
    where: gestionId ? { gestionId } : {},
    order: [['numero', 'DESC']],
  });
  return ultimo ? ultimo.numero + 1 : 1;
}
```

---

## 6. TIPOS DE CÁLCULOS QUE MANEJA

| Cálculo | Fórmula | Ubicación |
|---------|---------|-----------|
| **Partida Doble** | ΣDEBE = ΣHABER (±0.01) | comprobante.controller.js:73-92 |
| **Saldo Activo/Gasto** | DEBE - HABER | reporte.controller.js:135-136 |
| **Saldo Pasivo/Patrimonio/Ingreso** | HABER - DEBE | reporte.controller.js:137-138 |
| **Total Activo** | Σ(saldos de cuentas Activo) | reporte.controller.js:213 |
| **Total Pasivo** | Σ(saldos de cuentas Pasivo) | reporte.controller.js:216 |
| **Total Patrimonio** | Σ(saldos de cuentas Patrimonio) | reporte.controller.js:219 |
| **Utilidad del Ejercicio** | ΣIngresos - ΣGastos | reporte.controller.js:441-449 |
| **Ecuación Contable** | Activo = Pasivo + Patrimonio | BalanceGeneral.jsx:62-63 |
| **Estado de Resultados** | Ingresos - Gastos = Utilidad/Pérdida | reporte.controller.js:240-252 |
| **Evolución Patrimonio** | Patrimonio Inicial + Utilidad = Patrimonio Final | reporte.controller.js:265-277 |
| **Suma Debe** | Σ(debe) por cuenta | reporte.controller.js:322-328 |
| **Suma Haber** | Σ(haber) por cuenta | reporte.controller.js:322-328 |
| **Saldo Deudor** | max(DEBE-HABER, 0) para Activos/Gastos | reporte.controller.js:332-347 |
| **Saldo Acreedor** | max(HABER-DEBE, 0) para Pasivos/Patrimonio/Ingresos | reporte.controller.js:332-347 |
| **Totales Sumas y Saldos** | Σ(sumaDebe), Σ(sumaHaber), Σ(saldoDeudor), Σ(saldoAcreedor) | reporte.controller.js:349-352 |

---

## 7. API ENDPOINTS

| Método | Ruta | Descripción | Auth | Permiso |
|--------|------|-------------|------|---------|
| POST | `/api/auth/login` | Login | No | - |
| POST | `/api/auth/register` | Registro | No | - |
| GET | `/api/auth/me` | Perfil actual | Sí | - |
| GET | `/api/usuarios` | Listar usuarios | Sí | admin |
| POST | `/api/usuarios` | Crear usuario | Sí | admin |
| GET | `/api/roles` | Listar roles | Sí | admin |
| GET | `/api/roles/permisos` | Listar permisos | Sí | - |
| GET | `/api/empresa` | Datos empresa | Sí | - |
| PUT | `/api/empresa` | Actualizar empresa | Sí | config:update |
| GET | `/api/plan-cuentas` | Plan de cuentas | Sí | plan:read |
| POST | `/api/plan-cuentas` | Crear cuenta | Sí | plan:create |
| GET | `/api/comprobantes` | Listar comprobantes | Sí | comprobantes:read |
| POST | `/api/comprobantes` | Crear comprobante | Sí | comprobantes:create |
| PUT | `/api/comprobantes/:id` | Editar comprobante | Sí | comprobantes:update |
| POST | `/api/comprobantes/:id/anular` | Anular comprobante | Sí | comprobantes:anular |
| DELETE | `/api/comprobantes/:id` | Eliminar comprobante | Sí | comprobantes:anular |
| GET | `/api/reportes/libro-diario` | Libro Diario | Sí | reportes:read |
| GET | `/api/reportes/libro-mayor` | Libro Mayor | Sí | reportes:read |
| GET | `/api/reportes/balance-general` | Balance General | Sí | reportes:read |
| GET | `/api/reportes/estado-resultados` | Estado de Resultados | Sí | reportes:read |
| GET | `/api/reportes/evolucion-patrimonio` | Evolución Patrimonio | Sí | reportes:read |
| GET | `/api/reportes/sumas-saldos` | Sumas y Saldos | Sí | reportes:read |
| GET | `/api/export/comprobante/:id/pdf` | PDF comprobante | Sí | reportes:export |
| GET | `/api/export/libro-diario/pdf` | PDF libro diario | Sí | reportes:export |
| GET | `/api/export/balance-general/excel` | Excel balance | Sí | reportes:export |

---

## 8. CONCLUSIÓN

**EICAP MINI** es un sistema contable completo diseñado para el mercado boliviano que implementa correctamente los principios fundamentales de la contabilidad de partida doble. Su motor de cálculos se destaca por:

1. **Validación estricta de partida doble** con tolerancia de ±0.01 por redondeo
2. **Cálculo diferenciado de saldos** según la naturaleza de cada tipo de cuenta
3. **Verificación automática de la ecuación contable** (Activo = Pasivo + Patrimonio)
4. **Cálculo integrado de utilidad** que alimenta automáticamente el Balance General
5. **6 reportes financieros estándar** con exportación a PDF y Excel
6. **Plan de cuentas jerárquico** con integración SIAT para normativa boliviana
7. **Sistema RBAC completo** con 3 roles y 19 permisos granulares

El sistema es ideal para uso académico o pequeñas empresas en Bolivia, con una arquitectura limpia y bien organizada.
