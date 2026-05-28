const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const MovimientoInventario = sequelize.define('MovimientoInventario', {
  tipo: {
    type: DataTypes.ENUM('entrada', 'salida', 'ajuste', 'transferencia'),
    allowNull: false,
  },
  cantidad: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  costoUnitario: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
  },
  costoTotal: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
  },
  stockAnterior: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
  },
  stockPosterior: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
  },
  costoPromedio: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
  },
  documentoRef: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  proveedorCliente: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  motivo: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  productoId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'productos', key: 'id' },
  },
  empresaId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'empresas', key: 'id' },
  },
  fecha: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  timestamps: true,
  tableName: 'movimientos_inventario',
});

module.exports = MovimientoInventario;
