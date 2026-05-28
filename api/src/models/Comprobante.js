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
  documentoTipo: {
    type: DataTypes.ENUM('factura', 'nota_credito', 'nota_debito', 'recibo'),
    allowNull: true,
  },
  documentoNumero: {
    type: DataTypes.STRING,
    allowNull: true,
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
  pagado: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  fechaPago: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  subtotal: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  descuento: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: 0,
  },
  iva: {
    type: DataTypes.FLOAT,
    allowNull: true,
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
  usuarioIdContabiliza: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'usuarios',
      key: 'id',
    },
  },
  fechaContabilizacion: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  vendedorId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'usuarios',
      key: 'id',
    },
  },
  clienteProveedorId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'clientes_proveedores',
      key: 'id',
    },
  },
  cheque: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  usd: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  ufv: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
}, {
  timestamps: true,
  tableName: 'comprobantes',
});

module.exports = Comprobante;
