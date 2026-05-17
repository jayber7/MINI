const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const RolPermiso = sequelize.define('RolPermiso', {
  rolId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'roles',
      key: 'id',
    },
  },
  permisoId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'permisos',
      key: 'id',
    },
  },
}, {
  timestamps: false,
  tableName: 'roles_permisos',
  indexes: [
    {
      unique: true,
      fields: ['rolId', 'permisoId'],
    },
  ],
});

module.exports = RolPermiso;
