const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Permiso = sequelize.define('Permiso', {
  nombre: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  codigo: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  descripcion: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  modulo: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'general',
  },
}, {
  timestamps: true,
  tableName: 'permisos',
});

module.exports = Permiso;
