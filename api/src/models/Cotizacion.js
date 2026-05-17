const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Cotizacion = sequelize.define('Cotizacion', {
  fecha: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    unique: true,
  },
  ufv: {
    type: DataTypes.DECIMAL(10, 4),
    allowNull: false,
  },
  usd: {
    type: DataTypes.DECIMAL(10, 4),
    allowNull: false,
  },
}, {
  timestamps: true,
  tableName: 'cotizaciones',
});

module.exports = Cotizacion;
