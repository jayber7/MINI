const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ComprobanteDetalle = sequelize.define('ComprobanteDetalle', {
  comprobanteId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'comprobantes',
      key: 'id',
    },
  },
  planCuentaId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'plan_cuentas',
      key: 'id',
    },
  },
  glosa: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  debe: {
    type: DataTypes.DECIMAL(14, 2),
    allowNull: false,
    defaultValue: 0,
  },
  haber: {
    type: DataTypes.DECIMAL(14, 2),
    allowNull: false,
    defaultValue: 0,
  },
}, {
  timestamps: true,
  tableName: 'comprobantes_detalles',
});

module.exports = ComprobanteDetalle;
