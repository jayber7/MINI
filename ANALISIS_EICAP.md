# Análisis Detallado del Sistema Contable EICAP (.NET Windows Forms)

## 1. Descripción General del Proyecto

**EICAP** es un sistema contable integral de escritorio construido con **.NET Framework 4.7** y **Windows Forms**, diseñado para el régimen fiscal boliviano. Implementa contabilidad de partida doble con módulos de inventario, compras, ventas, facturación computarizada/electrónica, y reportes contables completos.

### Tecnologías Principales

| Tecnología | Propósito |
|---|---|
| .NET Framework 4.7 (C# 7) | Runtime y lenguaje |
| Windows Forms | UI de escritorio |
| SQLite | Base de datos embebida |
| Dapper | Micro-ORM para acceso a datos |
| iTextSharp | Generación de PDF |
| EPPlus | Generación de Excel |
| Newtonsoft.Json | Serialización JSON |
| LibCVI / LibEICAP3 | Librerías propias (integración SIAT/fiscal) |

### Arquitectura en Capas

```
┌─────────────────────────────────────────────────────────────┐
│                    EICAP (Windows Forms)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐ │
│  │  Formularios  │  │   Reportes   │  │  Helpers/Utilities │ │
│  │   (UI)       │  │  (PDF/Excel) │  │                    │ │
│  └──────┬───────┘  └──────┬───────┘  └────────┬───────────┘ │
│         │                 │                    │             │
│         └─────────────────┼────────────────────┘             │
│                           ↓                                  │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │           LibContable (Biblioteca de Negocio)            │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐ │ │
│  │  │Controller│→│  Entity  │→│ DataBase │→│  Utilities  │ │ │
│  │  └──────────┘ └──────────┘ └──────────┘ └────────────┘ │ │
│  └────────────────────────┬────────────────────────────────┘ │
└───────────────────────────┼──────────────────────────────────┘
                            ↓
              ┌─────────────────────────┐
              │  SQLite (2 bases datos)  │
              │  database.sqlite         │
              │  cotizaciones.db         │
              └─────────────────────────┘
```

---

## 2. Características Principales

### 2.1 Core Contable

- **Plan de Cuentas Jerárquico**: 5 niveles de profundidad con códigos auto-generados
- **Comprobantes (Operaciones)**: Ingreso, Egreso, Traspaso con validación estricta de balance
- **Libro Diario**: Listado cronológico de comprobantes con detalles expandibles
- **Libro Mayor**: Movimientos por cuenta con cálculo de saldo corriente
- **Balance General**: Activo = Pasivo + Patrimonio con verificación de ecuación contable
- **Estado de Resultados**: Ingresos - Gastos = Utilidad, con cálculo de IUE (25%)
- **Evolución del Patrimonio**: Patrimonio inicial + utilidad del ejercicio = patrimonio final
- **Sumas y Saldos**: Trial balance con 6 columnas (debe, haber, saldo deudor, saldo acreedor)

### 2.2 Gestión Fiscal Boliviana

- **IVA 13%**: Crédito fiscal (compras) y débito fiscal (ventas)
- **IT 3%**: Impuesto a las Transacciones (solo ventas)
- **IUE 25%**: Impuesto a las Utilidades de las Empresas
- **RC-IVA**: Retención 8% y 15.5%
- **Integración SIAT**: Soporte para facturación electrónica y computarizada
- **Códigos de Control**: Verificación de facturas
- **UFV/USD**: Tasas de cambio para conversión monetaria

### 2.3 Inventario

- **Gestión de Lotes**: Tracking por lote con fecha de vencimiento
- **FIFO/UEPS**: Método de evaluación configurable (PEPS por defecto, UEPS opcional)
- **Múltiples Almacenes**: Transferencias inter-almacén
- **Control de Stock**: Validación antes de ventas
- **Órdenes de Compra/Venta**: Con contingencia de pago (contado/crédito)

### 2.4 Facturación

- **Factura Computarizada**: Con código de control y autorización
- **Factura Electrónica**: Integración con sistema fiscal
- **Tokens QR**: Para verificación de facturas
- **Compras SIAT**: Importación desde sistema fiscal

### 2.5 Reportes y Exportación

- **PDF**: Comprobantes individuales y todos los reportes contables
- **Excel**: Todos los reportes con formato profesional
- **Firmas**: Configuración de firmas para documentos (contador, propietario, representante legal)

---

## 3. Base de Datos Completa

### 3.1 Configuración de Conexión

**Archivo**: `LibContable/Contable.cs`

El sistema usa **dos bases de datos SQLite**:

```csharp
// Base de datos principal (ruta dinámica)
public static string RutaDataBase { get; set; }
public static SQLiteConnection ConnectionDataBase => new SQLiteConnection(
    $"Data Source={Application.StartupPath}\\{RutaDataBase}");

// Base de datos de cotizaciones (separada)
public static SQLiteConnection ConnectionCotizacion => new SQLiteConnection(
    $"Data Source={Application.StartupPath}\\cotizaciones.db");
```

### 3.2 Esquema Completo de Tablas

#### Tablas Core Contables (11 tablas)

**`plan`** — Plan de Cuentas
```sql
CREATE TABLE plan (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo TEXT DEFAULT '',       -- Código jerárquico (ej: 1010202001)
    cuenta TEXT DEFAULT '',       -- Nombre de la cuenta
    nivel INTEGER DEFAULT '',     -- Nivel 1-5
    padre INTEGER DEFAULT '',     -- Código del padre
    tipo TEXT DEFAULT '',         -- ACTIVO, PASIVO, PATRIMONIO, INGRESO, GASTO, ORDEN, CONTINGENTES
    clase TEXT DEFAULT '',
    codigo_siat TEXT DEFAULT '',  -- Código integración SIAT
    cuenta_siat TEXT DEFAULT ''
);
```

**`operacion`** — Comprobantes/Cabecera
```sql
CREATE TABLE operacion (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numero INTEGER DEFAULT '',
    tipo TEXT DEFAULT '',          -- Ingreso, Egreso, Traspaso
    razon_social TEXT DEFAULT '',
    glosa TEXT DEFAULT '',
    cheque INTEGER DEFAULT '',
    fecha TEXT DEFAULT '',
    usd TEXT DEFAULT '',           -- Tasa USD del día
    ufv TEXT DEFAULT '',           -- Tasa UFV del día
    estado BOOLEAN DEFAULT 1,      -- 1=activo, 0=anulado
    proyecto_id INTEGER DEFAULT '',
    gestion_id INTEGER DEFAULT ''
);
```

**`operacion_detalle`** — Líneas de Comprobante
```sql
CREATE TABLE operacion_detalle (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    operacion_id INTEGER DEFAULT '',
    codigo TEXT DEFAULT '',        -- Código de cuenta del plan
    glosa TEXT DEFAULT '',
    debe double(10, 2) DEFAULT '',
    haber double(10, 2) DEFAULT ''
);
```

**`empresa`** — Datos de la Empresa
```sql
CREATE TABLE empresa (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    razon_social TEXT DEFAULT '',
    nit TEXT DEFAULT '',
    direccion TEXT DEFAULT '',
    telefono TEXT DEFAULT '',
    path_logo TEXT DEFAULT '',
    titulo_contador TEXT DEFAULT 'CONTADOR(A)',
    firma_contador TEXT DEFAULT '',
    titulo_propietario TEXT DEFAULT 'PROPIETARI(O/A)',
    firma_propietario TEXT DEFAULT '',
    titulo_representante_legal TEXT DEFAULT 'REPRESENTANTE LEGAL',
    firma_representante_legal TEXT DEFAULT '',
    generar_pdf BOOLEAN DEFAULT 0,
    gestion_id INTEGER DEFAULT '',
    metodo_evaluacion TEXT DEFAULT 'PEPS',  -- PEPS o UEPS
    iva_exento BOOLEAN DEFAULT 0,
    iva_exento_rm TEXT DEFAULT '0'
);
```

**`gestion`** — Períodos Fiscales
```sql
CREATE TABLE gestion (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    year INTEGER DEFAULT '',
    glosa TEXT DEFAULT '',
    inicio TEXT DEFAULT '',   -- Fecha inicio (varía por tipo de actividad)
    fin TEXT DEFAULT '',      -- Fecha fin
    actividad TEXT DEFAULT '' -- Comerciales, Industriales, Agrícolas, Mineras
);
```

**`proyecto`** — Centros de Costo
```sql
CREATE TABLE proyecto (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT DEFAULT ''
);
```

**`cuenta_especifica`** — Cuentas Especiales Mapeadas
```sql
CREATE TABLE cuenta_especifica (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo TEXT DEFAULT '',     -- Código del plan
    numero INTEGER DEFAULT '',
    nombre TEXT DEFAULT ''
);
```
Cuentas especiales mapeadas:
- ID 1: "Resultado del Ejercicio" (vincula utilidad al patrimonio)
- Cuentas específicas para IVA, IT, RC-IVA, Costo de Ventas, etc.

**`cuentas_especificas`** — Tabla duplicada/alternativa (misma estructura)

**`retencion`** — Retenciones de Impuestos
```sql
CREATE TABLE retencion (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contabilizado BOOLEAN DEFAULT 0,
    fecha TEXT DEFAULT '',
    glosa TEXT DEFAULT '',
    numero INTEGER DEFAULT '',
    tipo INTEGER DEFAULT '',
    importe double(10, 2) DEFAULT '',
    incremento BOOLEAN DEFAULT 0,
    debe TEXT DEFAULT '',       -- Código cuenta debe
    haber TEXT DEFAULT '',      -- Código cuenta haber
    id_operacion INTEGER DEFAULT ''
);
```

**`compra`** — Compras (versión simple)
```sql
CREATE TABLE compra (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contabilizado BOOLEAN DEFAULT 0,
    especificacion INTEGER DEFAULT '',
    fecha TEXT DEFAULT '',
    nit TEXT DEFAULT '',
    razon_social TEXT DEFAULT '',
    numero_compra TEXT DEFAULT '',
    numero_dui TEXT DEFAULT '',
    numero_autorizacion TEXT DEFAULT '',
    importe_total double(10, 2) DEFAULT '',
    importe_no_sujeto double(10, 2) DEFAULT '',
    descuentos double(10, 2) DEFAULT '',
    codigo_control TEXT DEFAULT '',
    tipo TEXT DEFAULT '',
    debe TEXT DEFAULT '',
    haber TEXT DEFAULT '',
    id_operacion INTEGER DEFAULT ''
);
```

**`compra_siat`** — Compras SIAT (versión completa con todos los impuestos)
```sql
CREATE TABLE compra_siat (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contabilizado BOOLEAN DEFAULT 0,
    especificacion TEXT DEFAULT '',
    nit TEXT DEFAULT '',
    razon_social TEXT DEFAULT '',
    numero_autorizacion TEXT DEFAULT '',
    numero_compra TEXT DEFAULT '',
    numero_dui_dim TEXT DEFAULT '',
    fecha TEXT DEFAULT '',
    importe_total double(10, 2) DEFAULT '',
    importe_ice double(10, 2) DEFAULT '',       -- ICE
    importe_iehd double(10, 2) DEFAULT '',      -- IEHD
    importe_ipj double(10, 2) DEFAULT '',       -- IPJ
    tasas double(10, 2) DEFAULT '',
    importe_no_sujeto double(10, 2) DEFAULT '',
    importe_exento double(10, 2) DEFAULT '',
    compras_tasa_cero double(10, 2) DEFAULT '',
    descuentos double(10, 2) DEFAULT '',
    importe_gift double(10, 2) DEFAULT '',
    tipo TEXT DEFAULT '',
    codigo_control TEXT DEFAULT '',
    debe TEXT DEFAULT '',
    haber TEXT DEFAULT '',
    id_operacion INTEGER DEFAULT 0,
    glosa TEXT DEFAULT ''
);
```

**`venta`** — Ventas (versión simple)
```sql
CREATE TABLE venta (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contabilizado BOOLEAN DEFAULT 0,
    especificacion INTEGER DEFAULT '',
    fecha TEXT DEFAULT '',
    numero_venta INTEGER DEFAULT '',
    numero_autorizacion TEXT DEFAULT '',
    estado_venta TEXT DEFAULT '',
    nit TEXT DEFAULT '',
    razon_social TEXT DEFAULT '',
    importe_total double(10, 2) DEFAULT '',
    importe_iit double(10, 2) DEFAULT '',
    importe_exento double(10, 2) DEFAULT '',
    tasa_cero double(10, 2) DEFAULT '',
    descuentos double(10, 2) DEFAULT '',
    codigo_control TEXT DEFAULT '',
    debe TEXT DEFAULT '',
    haber TEXT DEFAULT '',
    id_operacion INTEGER DEFAULT ''
);
```

**`venta_siat`** — Ventas SIAT (versión completa)
```sql
CREATE TABLE venta_siat (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    it BOOLEAN DEFAULT 1,
    contabilizado BOOLEAN DEFAULT 0,
    especificacion TEXT DEFAULT '',
    fecha TEXT DEFAULT '',
    numero_venta TEXT DEFAULT '',
    numero_autorizacion TEXT DEFAULT '',
    nit TEXT DEFAULT '',
    complemento TEXT DEFAULT '',
    razon_social TEXT DEFAULT '',
    importe_total double(10, 2) DEFAULT '',
    importe_ice double(10, 2) DEFAULT '',
    importe_iehd double(10, 2) DEFAULT '',
    importe_ipj double(10, 2) DEFAULT '',
    importe_tasas double(10, 2) DEFAULT '',
    importe_no_sujeto_iva double(10, 2) DEFAULT '',
    importe_exentos double(10, 2) DEFAULT '',
    importe_tasa_cero double(10, 2) DEFAULT '',
    importe_descuento double(10, 2) DEFAULT '',
    importe_gift_card double(10, 2) DEFAULT '',
    estado TEXT DEFAULT '',
    codigo_control TEXT DEFAULT '',
    tipo TEXT DEFAULT '',
    debe TEXT DEFAULT '',
    haber TEXT DEFAULT '',
    id_operacion INTEGER DEFAULT 0,
    glosa TEXT DEFAULT ''
);
```

#### Tablas de Inventario (15 tablas)

**`productos`**
```sql
CREATE TABLE productos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo TEXT DEFAULT '',
    nombre TEXT DEFAULT '',
    descripcion TEXT DEFAULT '',
    iva BOOLEAN DEFAULT 1,           -- Sujeto a IVA 13%
    ice BOOLEAN DEFAULT 0,           -- Sujeto a ICE
    vencimiento BOOLEAN DEFAULT 0,   -- Tiene fecha de vencimiento
    importe_ice double(10, 2) DEFAULT '',
    categoria_id INTEGER DEFAULT '',
    unidad_id INTEGER DEFAULT '',
    precio_compra_nominal double(10, 2) DEFAULT 0,
    precio_venta_nominal double(10, 2) DEFAULT 0,
    inventario BOOLEAN DEFAULT 1,    -- Controlado como inventario
    debe TEXT DEFAULT '',            -- Código cuenta contable debe
    haber TEXT DEFAULT ''            -- Código cuenta contable haber
);
```

**`lotes`** — Gestión de Lotes (FIFO/FEFO)
```sql
CREATE TABLE lotes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    n_lote TEXT DEFAULT '',
    codigo_lote TEXT DEFAULT '',
    precio double(10, 2) DEFAULT '',       -- Precio neto (sin IVA)
    cantidad double(10, 2) DEFAULT '',
    cantidad_vendido double(10, 2) DEFAULT 0,
    vencimiento TEXT DEFAULT '0',
    created_at TEXT DEFAULT '0',           -- Para ordenamiento FIFO
    producto_id INTEGER DEFAULT '',
    almacen_id INTEGER DEFAULT '',
    orden_compra_id INTEGER DEFAULT ''
);
```

**`almacenes`**, **`proveedores`**, **`clientes`**, **`categorias`**, **`unidades`**

**`orden_compra`** / **`orden_compra_detalle`**
**`orden_venta`** / **`orden_venta_detalle`**

**`almacen_producto`** — Mapeo producto-almacén
**`pagos`** / **`cobros`** — Seguimiento de pagos/cobros
**`traspaso`** / **`traspaso_detalle`** — Transferencias entre almacenes

#### Tablas de Facturación QR (3 tablas)

**`factura_computarizada`**, **`factura_electronica`**, **`tokens`**

#### Tablas Auxiliares SIAT

**`compra_aux`**, **`venta_aux`** — Bancarización y documentación auxiliar

---

## 4. Motor de Cálculos Contables

### 4.1 Validación de Balance (Partida Doble)

**Archivo**: `EICAP/SistemaContableEicap3._Operacion/AddOperacion.cs`

El sistema valida estrictamente que **DEBE == HABER** antes de guardar cualquier comprobante:

```csharp
// Validación estricta antes de guardar (líneas 244-248)
if (TxtDebe.Text != TxtHaber.Text)
{
    MessageBox.Show("Existe diferencia enre importes DEBE y HABER.");
    return;
}
```

Cálculo en tiempo real con indicador visual:

```csharp
private void SumarGrid()
{
    double num = 0.0;   // Total DEBE
    double num2 = 0.0;  // Total HABER
    foreach (DataGridViewRow item in (IEnumerable)DGrid.Rows)
    {
        num += ValFormat.ValDouble($"{item.Cells[3].Value}");
        num2 += ValFormat.ValDouble($"{item.Cells[4].Value}");
    }
    TxtDebe.Text = $"{num:#,##0.00}";
    TxtHaber.Text = $"{num2:#,##0.00}";
    double num3 = Math.Abs(num - num2);
    LDiferencia.Text = $"DIFERENCIA ENTRE IMPORTES : {num3:#,##0.00}";
    if (num3 == 0.0)
        LDiferencia.ForeColor = Color.Green;   // Balanceado ✓
    else
        LDiferencia.ForeColor = Color.DarkRed; // Desbalanceado ✗
}
```

### 4.2 Cálculo de Saldos por Tipo de Cuenta

**Archivo**: `LibContable.Controller.Contabilidad/ObtenerSaldosController.cs`

Este es el **corazón del motor contable**. Calcula saldos según la naturaleza de cada tipo de cuenta:

```csharp
// Saldo DEBE: para ACTIVO y GASTO (Debe - Haber)
public string ObtenerSaldosDebe(string codigo, string Desde, string Hasta, string Proyecto)
{
    string text = (Proyecto != "0") ? "AND proyecto_id = " + Proyecto : "";
    OpE();
    string sql = "SELECT printf('%.2f',SUM(operacion_detalle.debe)-SUM(operacion_detalle.haber)) 'debe' " +
        "FROM operacion INNER JOIN operacion_detalle ON operacion.id=operacion_detalle.operacion_id " +
        "INNER JOIN plan ON plan.codigo=operacion_detalle.codigo " +
        "WHERE fecha BETWEEN '" + Desde + "' AND '" + Hasta + "' AND estado = 1 " + text +
        " AND operacion_detalle.codigo='" + codigo + "' " +
        "GROUP BY operacion_detalle.codigo ORDER BY operacion_detalle.codigo ASC";
    string text2 = Contable.ConnectionDataBase.ExecuteScalar<string>(sql);
    CrrE();
    return text2 ?? "0.00";
}

// Saldo HABER: para PASIVO, PATRIMONIO, INGRESO (Haber - Debe)
public string ObtenerSaldosHaber(string codigo, string Desde, string Hasta, string Proyecto)
{
    string text = (Proyecto != "0") ? "AND proyecto_id = " + Proyecto : "";
    OpE();
    string sql = "SELECT printf('%.2f',SUM(operacion_detalle.haber)-SUM(operacion_detalle.debe)) 'debe' " +
        "FROM operacion INNER JOIN operacion_detalle ON operacion.id=operacion_detalle.operacion_id " +
        "INNER JOIN plan ON plan.codigo=operacion_detalle.codigo " +
        "WHERE fecha BETWEEN '" + Desde + "' AND '" + Hasta + "' AND estado = 1 " + text +
        " AND operacion_detalle.codigo='" + codigo + "' " +
        "GROUP BY operacion_detalle.codigo ORDER BY operacion_detalle.codigo ASC";
    string text2 = Contable.ConnectionDataBase.ExecuteScalar<string>(sql);
    CrrE();
    return text2 ?? "0.00";
}
```

### 4.3 Balance General

**Archivo**: `LibContable.Controller.Contabilidad/BalanceGeneralController.cs`

Algoritmo completo:

```csharp
public DataTable BalanceGeneral(string Desde, string Hasta, string Proyecto)
{
    // 1. Obtener código de "Resultado del Ejercicio"
    string codigo = cuentaEspecificaController.Read(1).Codigo;
    EstadoResultadoController estadoResultadoController = new EstadoResultadoController();

    // 2. Cargar plan de cuentas, filtrar solo ACTIVO, PASIVO, PATRIMONIO
    DataTable dataTable = planController.Table();
    dataTable.Columns.Add("importe");
    dataTable = DataGridUtilities.LimpiarTipo(dataTable, "INGRESO");
    dataTable = DataGridUtilities.LimpiarTipo(dataTable, "GASTO");
    dataTable = DataGridUtilities.LimpiarTipo(dataTable, "ORDEN");
    dataTable = DataGridUtilities.LimpiarTipo(dataTable, "CONTINGENTES");

    // 3. Calcular saldos por tipo de cuenta
    foreach (DataRow row in dataTable.Rows)
    {
        if ($"{row[3]}" == "5")  // Solo cuentas de nivel 5 (hoja)
        {
            if ($"{row[5]}" == "ACTIVO")
                row[9] = ObtenerSaldosDebe(codigo2, Desde, Hasta, Proyecto);
            else if ($"{row[5]}" == "PASIVO")
                row[9] = ObtenerSaldosHaber(codigo3, Desde, Hasta, Proyecto);
            else if ($"{row[5]}" == "PATRIMONIO")
            {
                // CASO ESPECIAL: Resultado del Ejercicio
                if ($"{row[1]}" == codigo)
                {
                    // Calcular utilidad: Ingresos - Gastos
                    double ingresos = 0.0, gastos = 0.0;
                    foreach (DataRow row2 in estadoResultadoController.EstadoResultado(Desde, Hasta, Proyecto).Rows)
                    {
                        if ($"{row2[5]}" == "INGRESO") ingresos += Convert.ToDouble($"{row2[9]}");
                        else if ($"{row2[5]}" == "GASTO") gastos += Convert.ToDouble($"{row2[9]}");
                    }
                    num3 = (gastos >= 0.0) ? (ingresos - gastos) : (ingresos - Math.Abs(gastos));
                }
                row[9] = $"{Convert.ToDouble(value) + num3:#,##0.00}";
            }
        }
    }

    // 4. Roll-up de totales (de nivel 5 a nivel 1)
    dataTable = DataGridUtilities.RellenarTotales(dataTable);
    return DataGridUtilities.LimpiarCeros(dataTable);
}
```

### 4.4 Estado de Resultados con IUE

**Archivo**: `LibContable.Controller.Contabilidad/EstadoResultadoController.cs`

```csharp
public DataTable EstadoResultado(string Desde, string Hasta, string Proyecto)
{
    // Filtrar solo INGRESO y GASTO
    DataTable dataTable = planController.Table();
    dataTable = DataGridUtilities.LimpiarTipo(dataTable, "ACTIVO");
    dataTable = DataGridUtilities.LimpiarTipo(dataTable, "PASIVO");
    dataTable = DataGridUtilities.LimpiarTipo(dataTable, "PATRIMONIO");

    foreach (DataRow row in dataTable.Rows)
    {
        if ($"{row[3]}" == "5")  // Nivel hoja
        {
            if ($"{row[5]}" == "INGRESO")
                row[9] = ObtenerSaldosHaber(row[1], Desde, Hasta, Proyecto);  // Haber - Debe
            else if ($"{row[5]}" == "GASTO")
                row[9] = ObtenerSaldosDebe(row[1], Desde, Hasta, Proyecto);   // Debe - Haber
        }
    }
    dataTable = DataGridUtilities.RellenarTotales(dataTable);
    return DataGridUtilities.LimpiarCeros(dataTable);
}
```

Cálculo de IUE y Utilidad Neta (en el formulario UI):

```csharp
// RESULTADO = INGRESOS - EGRESOS
resultado = (egresos >= 0.0) ? (ingresos - egresos) : (ingresos - Math.Abs(egresos));
resultado = Math.Round(resultado, 2);

// IUE (Impuesto a las Utilidades de las Empresas) = 25%
if (resultado > 0.0)
{
    iue = resultado * 0.25;         // 25% impuesto
    utilidadNeta = resultado * 0.75; // 75% ganancia neta
}
```

### 4.5 Sumas y Saldos (Trial Balance)

**Archivo**: `LibContable.Controller.Contabilidad/SumasSaldosController.cs`

Consulta SQL completa que calcula todo en una sola query:

```sql
SELECT
    operacion_detalle.codigo AS 'CÓDIGO',
    plan.cuenta AS 'CUENTA',
    printf('%.2f', SUM(operacion_detalle.debe)) AS 'DEBE',
    printf('%.2f', SUM(operacion_detalle.haber)) AS 'HABER',
    CASE plan.tipo
        WHEN 'ACTIVO' THEN printf('%.2f', SUM(operacion_detalle.debe) - SUM(operacion_detalle.haber))
        WHEN 'GASTO' THEN printf('%.2f', SUM(operacion_detalle.debe) - SUM(operacion_detalle.haber))
        ELSE printf('%.2f', 0)
    END AS 'SALDO DEBE',
    CASE plan.tipo
        WHEN 'ACTIVO' THEN printf('%.2f', 0)
        WHEN 'GASTO' THEN printf('%.2f', 0)
        ELSE printf('%.2f', SUM(operacion_detalle.haber) - SUM(operacion_detalle.debe))
    END AS 'SALDO HABER'
FROM operacion
INNER JOIN operacion_detalle ON operacion.id = operacion_detalle.operacion_id
INNER JOIN plan ON plan.codigo = operacion_detalle.codigo
WHERE fecha BETWEEN '...' AND '...' AND estado = 1
GROUP BY operacion_detalle.codigo
ORDER BY operacion_detalle.codigo ASC
```

### 4.6 Algoritmo de Roll-up Jerárquico (Agregación Recursiva)

**Archivo**: `LibContable.Utilities/DataGridUtilities.cs`

```csharp
// Agrega totales de nivel 5 → 4 → 3 → 2 → 1 recursivamente
public static DataTable RellenarTotales(DataTable DGrid,
    int Nivel = 5, int NivelObjetivo = 4,
    int ColumnaNivel = 3, int ColumnaImporte = 9)
{
    double num = 0.0;
    for (int num2 = DGrid.Rows.Count - 1; num2 >= 0; num2--)
    {
        if ($"{DGrid.Rows[num2][ColumnaNivel]}" == $"{Nivel}")
            num += Convert.ToDouble(DGrid.Rows[num2][ColumnaImporte]);

        if ($"{DGrid.Rows[num2][ColumnaNivel]}" == $"{NivelObjetivo}")
        {
            DGrid.Rows[num2][ColumnaImporte] = $"{num:#,##0.00}";
            num = 0.0;  // Reset para el siguiente grupo
        }
    }
    // Recursión: subir un nivel
    if (NivelObjetivo > 1)
        DGrid = RellenarTotales(DGrid, Nivel - 1, NivelObjetivo - 1);
    return DGrid;
}
```

---

## 5. Motor de Inventario y Contabilización Automática

### 5.1 FIFO/UEPS con Gestión de Lotes

**Archivo**: `LibContable.Controller.Inventario/LoteController.cs`

```csharp
// Obtener lotes ordenados por método de evaluación
public List<LoteModel> List(string almacen_id, string producto_id)
{
    EmpresaModel empresaModel = new EmpresaController().Read();
    // FIFO: ORDER BY created_at ASC (primero en entrar, primero en salir)
    // UEPS: ORDER BY created_at DESC (último en entrar, primero en salir)
    string empty = (empresaModel.MetodoEvaluacion == "UEPS")
        ? "ORDER BY created_at DESC"
        : "ORDER BY created_at ASC";

    return Contable.ConnectionDataBase.Query<LoteModel>(
        "SELECT * FROM lotes WHERE producto_id = " + producto_id +
        " AND almacen_id=" + almacen_id +
        " AND cantidad > cantidad_vendido " + empty).ToList();
}

// Decrementar lotes (consumir stock) con cálculo de costo
public double DecrementarLote(List<OperacionDetalleModel> OperacionDetalle,
    string AlmacenId, ProductoModel producto, string cantidad)
{
    double num = ValFormat.ValDouble(cantidad);
    List<LoteModel> list = List(AlmacenId, $"{producto.Id}");
    double num2 = 0.0;  // Costo total

    foreach (LoteModel item in list)
    {
        if (num == 0.0) break;

        double num3 = item.Cantidad - item.CantidadVendido;  // Disponible

        if (num3 >= num)
        {
            // Este lote cubre toda la necesidad
            decrementar($"{item.Id}", $"{num}");
            OperacionDetalle.Add(new OperacionDetalleModel
            {
                Codigo = producto.Debe,
                Glosa = "Costo de producto " + producto.Nombre,
                Debe = 0.0,
                Haber = item.Precio * num  // Costo al precio del lote
            });
            num2 += item.Precio * num;
            num = 0.0;
        }
        else
        {
            // Consumir todo este lote y continuar al siguiente
            decrementar($"{item.Id}", $"{num3}");
            OperacionDetalle.Add(new OperacionDetalleModel
            {
                Codigo = producto.Debe,
                Glosa = "Costo de producto " + producto.Nombre,
                Debe = 0.0,
                Haber = item.Precio * num3
            });
            num2 += item.Precio * num3;
            num -= num3;
        }
    }
    return num2;  // Retorna costo total para asiento contable
}
```

### 5.2 Contabilización Automática de Compras

**Archivo**: `LibContable.Controller.Inventario/OrdenCompraController.cs`

Genera automáticamente el asiento contable completo al contabilizar una orden de compra:

```csharp
public long Contabilizar(string Id)
{
    // ... obtener datos de la orden ...

    foreach (OrdenCompraDetalleModel item in ordenCompraDetalle)
    {
        ProductoModel productoModel = productoController.Read($"{item.ProductoId}");

        if (ordenCompraCabecera.MetodoPago == "AL CONTADO")
        {
            // HABER: Cuenta del producto (total bruto)
            list.Add(new OperacionDetalleModel {
                Codigo = productoModel.Haber,
                Haber = item.Precio * item.Cantidad - item.Descuento
            });
        }
        else if (ordenCompraCabecera.MetodoPago == "AL CREDITO")
        {
            // HABER: Cuenta de pagos pendientes del proveedor
            list.Add(new OperacionDetalleModel {
                Codigo = proveedorModel.CuentaPagosPendientes,
                Haber = item.Precio * item.Cantidad
            });
        }
        num += item.Precio * item.Cantidad;  // Total bruto
    }

    // DEBE: Cuenta de pagos realizados (neto sin IVA = 87%)
    list.Add(new OperacionDetalleModel {
        Codigo = proveedorModel.CuentaPagosRealizados,
        Debe = Math.Round(num * 0.87, 2)
    });

    // DEBE: Crédito Fiscal IVA (13%)
    list.Add(new OperacionDetalleModel {
        Codigo = CuentasEspecificas.CuentaCreditoFiscalIVA,  // 1010202001
        Debe = Math.Round(num * 0.13, 2)
    });

    // Si hay descuentos, ajustar
    if (num2 > 0.0)
    {
        list.Add(new OperacionDetalleModel {
            Codigo = CuentasEspecificas.CuentaDescuentosSobreCompras,
            Haber = num2 * 0.87
        });
        list.Add(new OperacionDetalleModel {
            Codigo = CuentasEspecificas.CuentaDebitoFiscalIVA,
            Haber = num2 * 0.13
        });
    }

    // DEBE: Costo inventariable por producto
    foreach (OrdenCompraDetalleModel item2 in ordenCompraDetalle)
    {
        ProductoModel productoModel2 = productoController.Read($"{item2.ProductoId}");
        if (productoModel2.Inventario)
        {
            double num7 = (item2.Precio * item2.Cantidad) - item2.Descuento
                        - (item2.Precio * item2.Cantidad * 0.13);  // Neto sin IVA
            list.Add(new OperacionDetalleModel {
                Codigo = productoModel2.Debe,
                Debe = num7
            });
        }
    }

    // HABER: Ajuste de costo de ventas
    list.Add(new OperacionDetalleModel {
        Codigo = CuentasEspecificas.CuentaCostoDeVentas,
        Haber = num4
    });

    return operacionController.Create(new AsientoModel {
        OperacionModel = operacionModel,
        OperacionDetallesModel = list
    });
}
```

### 5.3 Contabilización Automática de Ventas

**Archivo**: `LibContable.Controller.Inventario/OrdenVentaController.cs`

```csharp
public long Contabilizar(string Id)
{
    // ... obtener datos de la orden ...

    foreach (OrdenVentaDetalleModel item in ordenVentaDetalle)
    {
        // DEBE: Cuenta de cobros (contado o crédito)
        if (ordenVentaCabecera.MetodoPago == "AL CONTADO")
            list.Add(new OperacionDetalleModel {
                Codigo = productoModel.Haber,
                Debe = item.Precio * item.Cantidad
            });
        else
            list.Add(new OperacionDetalleModel {
                Codigo = clienteModel.CuentaCobrosPendientes,
                Debe = item.Precio * item.Cantidad
            });
        num += item.Precio * item.Cantidad;
    }

    // DEBE: Impuestos a las Transacciones (IT 3%)
    list.Add(new OperacionDetalleModel {
        Codigo = CuentasEspecificas.CuentaImpuestosALasTransacciones,  // 5020105001
        Debe = Math.Round(num * 0.03, 2)
    });
    // HABER: IT por Pagar
    list.Add(new OperacionDetalleModel {
        Codigo = CuentasEspecificas.CuentaImpuestosALasTransaccionesPorPagar,
        Haber = Math.Round(num * 0.03, 2)
    });

    // HABER: Débito Fiscal IVA (13%)
    list.Add(new OperacionDetalleModel {
        Codigo = CuentasEspecificas.CuentaDebitoFiscalIVA,  // 2010201001
        Haber = Math.Round(num * 0.13, 2)
    });

    // HABER: Cuenta cobros realizados (neto 87%)
    list.Add(new OperacionDetalleModel {
        Codigo = clienteModel.CuentaCobrosRealizados,
        Haber = Math.Round(num * 0.87, 2)
    });

    // Decrementar lotes y calcular costo de ventas
    double num2 = 0.0;
    foreach (OrdenVentaDetalleModel item2 in ordenVentaDetalle)
    {
        num2 += loteController.DecrementarLote(list, almacenId, producto, cantidad);
    }

    // DEBE: Costo de Ventas (desde lotes)
    list.Add(new OperacionDetalleModel {
        Codigo = CuentasEspecificas.CuentaCostoDeVentas,  // 5010101001
        Debe = num2
    });
    // HABER: Cuenta del producto (salida de inventario)
    // (agregado dentro de DecrementarLote)

    return operacionController.Create(new AsientoModel { ... });
}
```

---

## 6. Cálculos Fiscales Bolivianos

### 6.1 Tabla de Impuestos

| Impuesto | Tasa | Aplicación | Cuenta Contable |
|---|---|---|---|
| **IVA** | 13% | Compras (Crédito Fiscal) y Ventas (Débito Fiscal) | 1010202001 / 2010201001 |
| **IT** | 3% | Solo ventas | 5020105001 / 2010201002 |
| **IUE** | 25% | Utilidad neta del ejercicio | Calculado en Estado de Resultados |
| **RC-IVA** | 8% / 15.5% | Retenciones | 2010202001 |
| **ICE** | Variable | Productos específicos | Por producto |
| **IEHD** | Variable | Hidrocarburos | Por producto |
| **IPJ** | Variable | Juegos de azar | Por producto |

### 6.2 Cálculos Rápidos (Menú Contextual en Comprobantes)

**Archivo**: `EICAP/SistemaContableEicap3._Operacion/AddOperacion.cs`

```csharp
// Cálculos rápidos sobre el valor seleccionado en el grid
valorNeto87ToolStripMenuItem:  num = Math.Round(num * 0.87, 2);   // Neto sin IVA
iVA13ToolStripMenuItem:        num = Math.Round(num * 0.13, 2);   // IVA 13%
iT3ToolStripMenuItem:          num = Math.Round(num * 0.03, 2);   // IT 3%
rCIVAToolStripMenuItem:        num = Math.Round(num * 0.08, 2);   // RC-IVA 8%
rCIVA155ToolStripMenuItem:     num = Math.Round(num * 0.155, 2);  // RC-IVA 15.5%
```

### 6.3 Fórmulas Financieras Completas

| Fórmula | Expresión | Ubicación |
|---|---|---|
| **Saldo Debe** (Activo/Gasto) | `SUM(debe) - SUM(haber)` | `ObtenerSaldosController.cs:15` |
| **Saldo Haber** (Pasivo/Patrimonio/Ingreso) | `SUM(haber) - SUM(debe)` | `ObtenerSaldosController.cs:33` |
| **Resultado del Ejercicio** | `INGRESOS - EGRESOS` | `EstadoResultado.cs` |
| **IUE** | `resultado > 0 ? resultado * 0.25 : 0` | `EstadoResultado.cs` |
| **Utilidad Neta** | `resultado > 0 ? resultado * 0.75 : resultado` | `EstadoResultado.cs` |
| **Ecuación Contable** | `ACTIVO == PASIVO + PATRIMONIO` | `BalanceGeneral.cs` |
| **Balance Comprobante** | `Math.Abs(Sum(debe) - Sum(haber)) == 0` | `AddOperacion.cs:606` |
| **Neto sin IVA** | `bruto * 0.87` | Múltiples archivos |
| **IVA** | `bruto * 0.13` | Múltiples archivos |
| **IT** | `venta_total * 0.03` | `OrdenVentaController.cs:240` |
| **Costo Inventariable** | `(precio × cantidad - descuento) - (precio × cantidad × 0.13)` | `OrdenCompraController.cs:286` |
| **Stock** | `Σ(cantidad - cantidad_vendido)` por lote | `LoteController.cs:89-101` |

---

## 7. Fragmentos de Código Más Destacados

### 7.1 Motor de Balance General (el más complejo)

```csharp
// BalanceGeneralController.cs — Líneas 14-74
public DataTable BalanceGeneral(string Desde, string Hasta, string Proyecto)
{
    string codigo = cuentaEspecificaController.Read(1).Codigo;
    EstadoResultadoController estadoResultadoController = new EstadoResultadoController();
    DataTable dataTable = planController.Table();
    dataTable.Columns.Add("importe");
    dataTable = DataGridUtilities.LimpiarTipo(dataTable, "INGRESO");
    dataTable = DataGridUtilities.LimpiarTipo(dataTable, "GASTO");
    dataTable = DataGridUtilities.LimpiarTipo(dataTable, "ORDEN");
    dataTable = DataGridUtilities.LimpiarTipo(dataTable, "CONTINGENTES");

    foreach (DataRow row in dataTable.Rows)
    {
        if ($"{row[3]}" == "5")
        {
            if ($"{row[5]}" == "ACTIVO")
                row[9] = string.Format("{0:#,##0.00}",
                    Convert.ToDouble(ObtenerSaldosDebe($"{row[1]}", Desde, Hasta, Proyecto)));
            else if ($"{row[5]}" == "PASIVO")
                row[9] = string.Format("{0:#,##0.00}",
                    Convert.ToDouble(ObtenerSaldosHaber($"{row[1]}", Desde, Hasta, Proyecto)));
            else if ($"{row[5]}" == "PATRIMONIO")
            {
                double num = 0.0, num2 = 0.0, num3 = 0.0;
                if ($"{row[1]}" == codigo)  // Resultado del Ejercicio
                {
                    foreach (DataRow row2 in estadoResultadoController
                        .EstadoResultado(Desde, Hasta, Proyecto).Rows)
                    {
                        if ($"{row2[5]}" == "INGRESO") num += Convert.ToDouble($"{row2[9]}");
                        else if ($"{row2[5]}" == "GASTO") num2 += Convert.ToDouble($"{row2[9]}");
                    }
                    num3 = (num2 >= 0.0) ? (num - num2) : (num - Math.Abs(num2));
                }
                string value = ObtenerSaldosHaber($"{row[1]}", Desde, Hasta, Proyecto);
                row[9] = $"{Convert.ToDouble(value) + num3:#,##0.00}";
            }
        }
    }
    dataTable = DataGridUtilities.RellenarTotales(dataTable);
    return DataGridUtilities.LimpiarCeros(dataTable);
}
```

### 7.2 Contabilización de Ventas con FIFO

```csharp
// OrdenVentaController.cs — Líneas 189-283
public long Contabilizar(string Id)
{
    // ... crear cabecera de operacion ...

    // 1. Registrar ingresos brutos
    foreach (OrdenVentaDetalleModel item in ordenVentaDetalle)
    {
        list.Add(new OperacionDetalleModel {
            Debe = item.Precio * item.Cantidad, Haber = 0.0
        });
        num += item.Precio * item.Cantidad;
    }

    // 2. Registrar IT 3%
    list.Add(new OperacionDetalleModel {
        Codigo = CuentasEspecificas.CuentaImpuestosALasTransacciones,
        Debe = Math.Round(num * 0.03, 2), Haber = 0.0
    });
    list.Add(new OperacionDetalleModel {
        Codigo = CuentasEspecificas.CuentaImpuestosALasTransaccionesPorPagar,
        Debe = 0.0, Haber = Math.Round(num * 0.03, 2)
    });

    // 3. Registrar Débito Fiscal IVA 13%
    list.Add(new OperacionDetalleModel {
        Codigo = CuentasEspecificas.CuentaDebitoFiscalIVA,
        Debe = 0.0, Haber = Math.Round(num * 0.13, 2)
    });

    // 4. Registrar ingreso neto 87%
    list.Add(new OperacionDetalleModel {
        Codigo = clienteModel.CuentaCobrosRealizados,
        Debe = 0.0, Haber = Math.Round(num * 0.87, 2)
    });

    // 5. Decrementar lotes FIFO y calcular costo
    double num2 = 0.0;
    foreach (OrdenVentaDetalleModel item2 in ordenVentaDetalle)
    {
        num2 += loteController.DecrementarLote(list, almacenId, producto, cantidad);
    }

    // 6. Registrar Costo de Ventas
    list.Add(new OperacionDetalleModel {
        Codigo = CuentasEspecificas.CuentaCostoDeVentas,
        Debe = num2, Haber = 0.0
    });

    return operacionController.Create(new AsientoModel { ... });
}
```

### 7.3 Sumas y Saldos en una sola SQL

```sql
-- SumasSaldosController.cs — Línea 18
SELECT
    operacion_detalle.codigo AS 'CÓDIGO',
    plan.cuenta AS 'CUENTA',
    printf('%.2f', SUM(operacion_detalle.debe)) AS 'DEBE',
    printf('%.2f', SUM(operacion_detalle.haber)) AS 'HABER',
    CASE plan.tipo
        WHEN 'ACTIVO' THEN printf('%.2f', SUM(debe) - SUM(haber))
        WHEN 'GASTO' THEN printf('%.2f', SUM(debe) - SUM(haber))
        ELSE printf('%.2f', 0)
    END AS 'SALDO DEBE',
    CASE plan.tipo
        WHEN 'ACTIVO' THEN printf('%.2f', 0)
        WHEN 'GASTO' THEN printf('%.2f', 0)
        ELSE printf('%.2f', SUM(haber) - SUM(debe))
    END AS 'SALDO HABER'
FROM operacion
INNER JOIN operacion_detalle ON operacion.id = operacion_detalle.operacion_id
INNER JOIN plan ON plan.codigo = operacion_detalle.codigo
WHERE fecha BETWEEN '...' AND '...' AND estado = 1
GROUP BY operacion_detalle.codigo
ORDER BY operacion_detalle.codigo ASC
```

### 7.4 Roll-up Recursivo de Totales

```csharp
// DataGridUtilities.cs — Líneas 53-79
public static DataTable RellenarTotales(DataTable DGrid,
    int Nivel = 5, int NivelObjetivo = 4,
    int ColumnaNivel = 3, int ColumnaImporte = 9)
{
    double num = 0.0;
    for (int num2 = DGrid.Rows.Count - 1; num2 >= 0; num2--)
    {
        if ($"{DGrid.Rows[num2][ColumnaNivel]}" == $"{Nivel}")
            num += Convert.ToDouble(DGrid.Rows[num2][ColumnaImporte]);

        if ($"{DGrid.Rows[num2][ColumnaNivel]}" == $"{NivelObjetivo}")
        {
            DGrid.Rows[num2][ColumnaImporte] = $"{num:#,##0.00}";
            num = 0.0;
        }
    }
    if (NivelObjetivo > 1)
        DGrid = RellenarTotales(DGrid, Nivel - 1, NivelObjetivo - 1);
    return DGrid;
}
```

---

## 8. Resumen de Módulos

| Módulo | Archivos Clave | Funcionalidad |
|---|---|---|
| **Core Contable** | `ObtenerSaldosController.cs`, `BalanceGeneralController.cs`, `EstadoResultadoController.cs`, `SumasSaldosController.cs`, `LibroMayorController.cs`, `LibroDiarioController.cs` | 6 reportes contables con cálculos de saldos |
| **Comprobantes** | `AddOperacion.cs`, `OperacionController.cs` | CRUD con validación de balance |
| **Plan de Cuentas** | `PlanController.cs` | Jerarquía 5 niveles, auto-código |
| **Compras** | `OrdenCompraController.cs`, `AddCompra.cs` | Contabilización automática con IVA 13% |
| **Ventas** | `OrdenVentaController.cs`, `CreateVenta.cs` | Contabilización con IT 3%, IVA 13%, FIFO |
| **Inventario** | `LoteController.cs`, `ProductoController.cs` | FIFO/UEPS, lotes, stock, transferencias |
| **Facturación** | `FacturaCompModel.cs`, `FacturaElectModel.cs` | Computarizada y electrónica |
| **Retenciones** | `RetencionModel.cs`, `RetencionController.cs` | RC-IVA 8%/15.5% |
| **Empresa/Gestión** | `EmpresaController.cs`, `GestionController.cs` | Configuración, períodos fiscales |
| **Exportación** | `Reports.Pdf/`, `Reports.Excel/` | PDF con iTextSharp, Excel con EPPlus |

---

## 9. Estadísticas del Proyecto

| Métrica | Valor |
|---|---|
| **Framework** | .NET Framework 4.7, C# 7 |
| **UI** | Windows Forms |
| **Base de datos** | SQLite (2 archivos: principal + cotizaciones) |
| **Tablas totales** | 33 |
| **Entidades** | 14+ modelos |
| **Controllers** | 20+ clases |
| **Formularios** | 50+ ventanas |
| **Librerías externas** | Dapper, iTextSharp, EPPlus, Newtonsoft.Json, LibCVI, LibEICAP3 |
| **Regimen fiscal** | Boliviano (IVA, IT, IUE, RC-IVA, ICE, IEHD, IPJ) |
| **Moneda** | Bolivianos (Bs.) con soporte UFV/USD |
| **Métodos de inventario** | FIFO (PEPS) y UEPS |

---

*Reporte generado el 17 de mayo de 2026*
*Sistema: EICAP — Sistema Contable Integral (.NET Windows Forms)*
