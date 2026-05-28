const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Producto = sequelize.define('Producto', {
  codigo: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  codigoBarras: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  nombre: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  categoria: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  subcategoria: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  unidadMedida: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'UNIDAD',
  },
  ubicacion: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  stockActual: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
  },
  stockMinimo: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
  },
  stockMaximo: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 999999,
  },
  costoUnitario: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
  },
  precioVenta: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
  },
  codigoSIN: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  activo: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  empresaId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'empresas', key: 'id' },
  },
}, {
  timestamps: true,
  tableName: 'productos',
});

module.exports = Producto;
