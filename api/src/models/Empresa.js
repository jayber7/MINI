const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Empresa = sequelize.define('Empresa', {
  nombre: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Mi Empresa',
  },
  nit: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: '0000000000',
  },
  direccion: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  telefono: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  logoUrl: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  tituloContador: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  firmaContador: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  tituloPropietario: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  firmaPropietario: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  tituloRepresentanteLegal: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  firmaRepresentanteLegal: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  gestionActualId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
}, {
  timestamps: true,
  tableName: 'empresas',
});

module.exports = Empresa;
