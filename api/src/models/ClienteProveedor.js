const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ClienteProveedor = sequelize.define('ClienteProveedor', {
  tipo: {
    type: DataTypes.ENUM('cliente', 'proveedor', 'ambos'),
    allowNull: false,
  },
  nit: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  razonSocial: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  nombreComercial: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  direccion: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  telefono: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  contacto: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  empresaId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'empresas', key: 'id' },
  },
}, {
  timestamps: true,
  tableName: 'clientes_proveedores',
});

module.exports = ClienteProveedor;
