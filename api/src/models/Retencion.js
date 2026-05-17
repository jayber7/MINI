const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Retencion = sequelize.define('Retencion', {
  fecha: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  glosa: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  numero: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  tipo: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '8 = RC-IVA 8%, 15 = RC-IVA 15.5%',
  },
  importe: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
  },
  incremento: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  debe: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Código de cuenta debe',
  },
  haber: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Código de cuenta haber',
  },
  contabilizado: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  comprobanteId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  empresaId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
}, {
  timestamps: true,
  tableName: 'retenciones',
});

module.exports = Retencion;
