const { DataTypes } = require('sequelize');
const sequelize = require('./database');

const Empresa = sequelize.define('Empresa', {
  nombre: { type: DataTypes.STRING, allowNull: false },
  nit: { type: DataTypes.STRING, allowNull: true },
  gestionInicio: { type: DataTypes.DATEONLY, defaultValue: '2026-01-01' },
  gestionFin: { type: DataTypes.DATEONLY, defaultValue: '2026-12-31' }
});

const Cuenta = sequelize.define('Cuenta', {
  codigo: { type: DataTypes.STRING, unique: true },
  nombre: { type: DataTypes.STRING },
  tipo: { type: DataTypes.ENUM('Activo', 'Pasivo', 'Patrimonio', 'Ingreso', 'Egreso') },
  saldo: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0.00 }
});

module.exports = { Empresa, Cuenta };
