const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Comprobante = sequelize.define('Comprobante', {
  numero: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  tipoComprobante: {
    type: DataTypes.ENUM('ingreso', 'egreso', 'traspaso'),
    allowNull: false,
  },
  glosa: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  fecha: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  estado: {
    type: DataTypes.ENUM('activo', 'anulado', 'contabilizado'),
    allowNull: false,
    defaultValue: 'activo',
  },
  proyectoId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'proyectos',
      key: 'id',
    },
  },
  gestionId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'gestiones',
      key: 'id',
    },
  },
  empresaId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'empresas',
      key: 'id',
    },
  },
  usuarioIdCrea: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'usuarios',
      key: 'id',
    },
  },
  usuarioIdAnula: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'usuarios',
      key: 'id',
    },
  },
  fechaAnulacion: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  timestamps: true,
  tableName: 'comprobantes',
});

module.exports = Comprobante;
