const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CuentaEspecifica = sequelize.define('CuentaEspecifica', {
  codigo: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  numero: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
  },
  nombre: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  empresaId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'empresas',
      key: 'id',
    },
  },
}, {
  timestamps: true,
  tableName: 'cuentas_especificas',
});

module.exports = CuentaEspecifica;
