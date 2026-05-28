const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PlanCuenta = sequelize.define('PlanCuenta', {
  codigo: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  nombre: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  nivel: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
  padreId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'plan_cuentas',
      key: 'id',
    },
  },
  tipo: {
    type: DataTypes.ENUM('Activo', 'Pasivo', 'Patrimonio', 'Ingreso', 'Gasto', 'Orden', 'Contingentes'),
    allowNull: false,
  },
  clase: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  codigoSiat: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  cuentaSiat: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  empresaId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'empresas',
      key: 'id',
    },
  },
  clasificacionFlujo: {
    type: DataTypes.ENUM('operacion', 'inversion', 'financiamiento'),
    allowNull: true,
  },
}, {
  timestamps: true,
  tableName: 'plan_cuentas',
  indexes: [
    { unique: true, fields: ['codigo', 'empresaId'] },
  ],
});

module.exports = PlanCuenta;
