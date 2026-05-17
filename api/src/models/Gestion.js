const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Gestion = sequelize.define('Gestion', {
  year: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  glosa: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  fechaInicio: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: '2026-01-01',
  },
  fechaFin: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: '2026-12-31',
  },
  actividad: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'Comercial',
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
  tableName: 'gestiones',
});

module.exports = Gestion;
