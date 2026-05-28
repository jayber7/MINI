const sequelize = require('../config/database');
const Rol = require('./Rol');
const Permiso = require('./Permiso');
const Usuario = require('./Usuario');
const RolPermiso = require('./RolPermiso');
const Empresa = require('./Empresa');
const Gestion = require('./Gestion');
const PlanCuenta = require('./PlanCuenta');
const Proyecto = require('./Proyecto');
const Comprobante = require('./Comprobante');
const ComprobanteDetalle = require('./ComprobanteDetalle');
const CuentaEspecifica = require('./CuentaEspecifica');
const Cotizacion = require('./Cotizacion');
const Retencion = require('./Retencion');
const Compra = require('./Compra');
const Venta = require('./Venta');
const ClienteProveedor = require('./ClienteProveedor');
const Producto = require('./Producto');
const MovimientoInventario = require('./MovimientoInventario');

// Roles y Permisos (muchos a muchos)
Rol.belongsToMany(Permiso, { through: RolPermiso, foreignKey: 'rolId' });
Permiso.belongsToMany(Rol, { through: RolPermiso, foreignKey: 'permisoId' });

// Usuario pertenece a un Rol
Usuario.belongsTo(Rol, { foreignKey: 'rolId' });
Rol.hasMany(Usuario, { foreignKey: 'rolId' });

// Empresa tiene muchas Gestiones
Empresa.hasMany(Gestion, { foreignKey: 'empresaId' });
Gestion.belongsTo(Empresa, { foreignKey: 'empresaId' });

// Empresa tiene muchas PlanCuentas
Empresa.hasMany(PlanCuenta, { foreignKey: 'empresaId' });
PlanCuenta.belongsTo(Empresa, { foreignKey: 'empresaId' });

// PlanCuenta jerárquica (padre-hijo)
PlanCuenta.belongsTo(PlanCuenta, { as: 'padre', foreignKey: 'padreId' });
PlanCuenta.hasMany(PlanCuenta, { as: 'hijos', foreignKey: 'padreId' });

// Empresa tiene muchos Proyectos
Empresa.hasMany(Proyecto, { foreignKey: 'empresaId' });
Proyecto.belongsTo(Empresa, { foreignKey: 'empresaId' });

// Gestion tiene muchos Comprobantes
Gestion.hasMany(Comprobante, { foreignKey: 'gestionId' });
Comprobante.belongsTo(Gestion, { foreignKey: 'gestionId' });

// Empresa tiene muchos Comprobantes
Empresa.hasMany(Comprobante, { foreignKey: 'empresaId' });
Comprobante.belongsTo(Empresa, { foreignKey: 'empresaId' });

// Proyecto tiene muchos Comprobantes
Proyecto.hasMany(Comprobante, { foreignKey: 'proyectoId' });
Comprobante.belongsTo(Proyecto, { foreignKey: 'proyectoId' });

// Usuario crea muchos Comprobantes
Usuario.hasMany(Comprobante, { as: 'comprobantesCreados', foreignKey: 'usuarioIdCrea' });
Comprobante.belongsTo(Usuario, { as: 'usuarioCrea', foreignKey: 'usuarioIdCrea' });

// Usuario anula muchos Comprobantes
Usuario.hasMany(Comprobante, { as: 'comprobantesAnulados', foreignKey: 'usuarioIdAnula' });
Comprobante.belongsTo(Usuario, { as: 'usuarioAnula', foreignKey: 'usuarioIdAnula' });

// Comprobante tiene muchos detalles
Comprobante.hasMany(ComprobanteDetalle, { foreignKey: 'comprobanteId' });
ComprobanteDetalle.belongsTo(Comprobante, { foreignKey: 'comprobanteId' });

// ComprobanteDetalle pertenece a una cuenta
PlanCuenta.hasMany(ComprobanteDetalle, { foreignKey: 'planCuentaId' });
ComprobanteDetalle.belongsTo(PlanCuenta, { foreignKey: 'planCuentaId' });

// Empresa tiene muchas CuentasEspecificas
Empresa.hasMany(CuentaEspecifica, { foreignKey: 'empresaId' });
CuentaEspecifica.belongsTo(Empresa, { foreignKey: 'empresaId' });

// Empresa tiene muchas Retenciones
Empresa.hasMany(Retencion, { foreignKey: 'empresaId' });
Retencion.belongsTo(Empresa, { foreignKey: 'empresaId' });

// Comprobante puede tener retenciones
Comprobante.hasMany(Retencion, { foreignKey: 'comprobanteId' });
Retencion.belongsTo(Comprobante, { foreignKey: 'comprobanteId' });

// Empresa tiene muchas Compras y Ventas
Empresa.hasMany(Compra, { foreignKey: 'empresaId' });
Compra.belongsTo(Empresa, { foreignKey: 'empresaId' });
Empresa.hasMany(Venta, { foreignKey: 'empresaId' });
Venta.belongsTo(Empresa, { foreignKey: 'empresaId' });

// Comprobante puede tener compras/ventas contabilizadas
Comprobante.hasMany(Compra, { foreignKey: 'comprobanteId' });
Compra.belongsTo(Comprobante, { foreignKey: 'comprobanteId' });
Comprobante.hasMany(Venta, { foreignKey: 'comprobanteId' });
Venta.belongsTo(Comprobante, { foreignKey: 'comprobanteId' });

// ClienteProveedor
Empresa.hasMany(ClienteProveedor, { foreignKey: 'empresaId' });
ClienteProveedor.belongsTo(Empresa, { foreignKey: 'empresaId' });
Comprobante.belongsTo(ClienteProveedor, { foreignKey: 'clienteProveedorId' });
ClienteProveedor.hasMany(Comprobante, { foreignKey: 'clienteProveedorId' });

// Vendedor (Usuario como vendedor en Comprobante)
Usuario.hasMany(Comprobante, { as: 'comprobantesVendidos', foreignKey: 'vendedorId' });
Comprobante.belongsTo(Usuario, { as: 'vendedor', foreignKey: 'vendedorId' });

// Productos
Empresa.hasMany(Producto, { foreignKey: 'empresaId' });
Producto.belongsTo(Empresa, { foreignKey: 'empresaId' });

// Movimientos de Inventario
Producto.hasMany(MovimientoInventario, { foreignKey: 'productoId' });
MovimientoInventario.belongsTo(Producto, { foreignKey: 'productoId' });
Empresa.hasMany(MovimientoInventario, { foreignKey: 'empresaId' });
MovimientoInventario.belongsTo(Empresa, { foreignKey: 'empresaId' });

module.exports = {
  sequelize,
  Rol,
  Permiso,
  Usuario,
  RolPermiso,
  Empresa,
  Gestion,
  PlanCuenta,
  Proyecto,
  Comprobante,
  ComprobanteDetalle,
  CuentaEspecifica,
  Cotizacion,
  Retencion,
  Compra,
  Venta,
  ClienteProveedor,
  Producto,
  MovimientoInventario,
};
