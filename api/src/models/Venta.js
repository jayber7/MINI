const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Venta = sequelize.define('Venta', {
  fecha: { type: DataTypes.STRING, allowNull: false },
  nit: { type: DataTypes.STRING, allowNull: true },
  razonSocial: { type: DataTypes.STRING, allowNull: true },
  numeroVenta: { type: DataTypes.STRING, allowNull: false },
  numeroAutorizacion: { type: DataTypes.STRING, allowNull: true },
  importeTotal: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  importeExento: { type: DataTypes.DECIMAL(10, 2), allowNull: true, defaultValue: 0 },
  descuentos: { type: DataTypes.DECIMAL(10, 2), allowNull: true, defaultValue: 0 },
  codigoControl: { type: DataTypes.STRING, allowNull: true },
  tipo: { type: DataTypes.STRING, allowNull: false, defaultValue: 'interno' },
  glosa: { type: DataTypes.STRING, allowNull: true },
  contabilizado: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  comprobanteId: { type: DataTypes.INTEGER, allowNull: true },
  empresaId: { type: DataTypes.INTEGER, allowNull: false },
}, {
  timestamps: true,
  tableName: 'ventas',
});

module.exports = Venta;
