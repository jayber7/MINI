const express = require('express');
const cors = require('cors');
const sequelize = require('./database');
const { Empresa, Cuenta } = require('./models');

const app = express();
app.use(cors());
app.use(express.json());

// Sincronizar Base de Datos y Semilla de Datos
sequelize.sync({ force: true }).then(async () => {
  console.log('Database synced');
  
  await Empresa.create({});
  
  const cuentassSeed = [
    { codigo: '1', nombre: 'Activo', tipo: 'Activo', saldo: 0 },
    { codigo: '1.1', nombre: 'Caja', tipo: 'Activo', saldo: 5000 },
    { codigo: '1.2', nombre: 'Bancos', tipo: 'Activo', saldo: 15000 },
    { codigo: '1.3', nombre: 'Inventarios', tipo: 'Activo', saldo: 8000 },
    { codigo: '2', nombre: 'Pasivo', tipo: 'Pasivo', saldo: 0 },
    { codigo: '2.1', nombre: 'Cuentas por Pagar', tipo: 'Pasivo', saldo: 3000 },
    { codigo: '3', nombre: 'Patrimonio', tipo: 'Patrimonio', saldo: 0 },
    { codigo: '3.1', nombre: 'Capital Social', tipo: 'Patrimonio', saldo: 20000 },
    { codigo: '4', nombre: 'Ingresos', tipo: 'Ingreso', saldo: 0 },
    { codigo: '4.1', nombre: 'Ventas', tipo: 'Ingreso', saldo: 12000 },
    { codigo: '5', nombre: 'Egresos', tipo: 'Egreso', saldo: 0 },
    { codigo: '5.1', nombre: 'Costo de Ventas', tipo: 'Egreso', saldo: 6000 },
    { codigo: '5.2', nombre: 'Gastos Administrativos', tipo: 'Egreso', saldo: 1000 },
  ];
  
  await Cuenta.bulkCreate(cuentassSeed);
});

// Endpoints
app.get('/api/empresa', async (req, res) => {
  const empresa = await Empresa.findOne();
  res.json(empresa);
});

app.get('/api/cuentas', async (req, res) => {
  const cuentas = await Cuenta.findAll();
  res.json(cuentas);
});

app.post('/api/cuentas/:id', async (req, res) => {
  const { saldo } = req.body;
  await Cuenta.update({ saldo }, { where: { id: req.params.id } });
  res.sendStatus(200);
});

// Lógica de Reportes
app.get('/api/reportes/balance', async (req, res) => {
  const cuentas = await Cuenta.findAll();
  const activo = cuentas.filter(c => c.tipo === 'Activo').reduce((acc, curr) => acc + parseFloat(curr.saldo), 0);
  const pasivo = cuentas.filter(c => c.tipo === 'Pasivo').reduce((acc, curr) => acc + parseFloat(curr.saldo), 0);
  const patrimonio = cuentas.filter(c => c.tipo === 'Patrimonio').reduce((acc, curr) => acc + parseFloat(curr.saldo), 0);
  
  res.json({ activo, pasivo, patrimonio, detalle: cuentas.filter(c => ['Activo', 'Pasivo', 'Patrimonio'].includes(c.tipo)) });
});

app.get('/api/reportes/resultados', async (req, res) => {
  const cuentas = await Cuenta.findAll();
  const ingresos = cuentas.filter(c => c.tipo === 'Ingreso').reduce((acc, curr) => acc + parseFloat(curr.saldo), 0);
  const egresos = cuentas.filter(c => c.tipo === 'Egreso').reduce((acc, curr) => acc + parseFloat(curr.saldo), 0);
  const utilidad = ingresos - egresos;
  
  res.json({ ingresos, egresos, utilidad, detalle: cuentas.filter(c => ['Ingreso', 'Egreso'].includes(c.tipo)) });
});

app.get('/api/reportes/patrimonio', async (req, res) => {
  const cuentas = await Cuenta.findAll();
  const ingresos = cuentas.filter(c => c.tipo === 'Ingreso').reduce((acc, curr) => acc + parseFloat(curr.saldo), 0);
  const egresos = cuentas.filter(c => c.tipo === 'Egreso').reduce((acc, curr) => acc + parseFloat(curr.saldo), 0);
  const utilidad = ingresos - egresos;
  
  const detallePatrimonio = cuentas.filter(c => c.tipo === 'Patrimonio');
  const patrimonioInicial = detallePatrimonio.reduce((acc, curr) => acc + parseFloat(curr.saldo), 0);
  
  res.json({ 
    patrimonioInicial, 
    utilidad, 
    patrimonioFinal: patrimonioInicial + utilidad,
    detalle: detallePatrimonio 
  });
});

app.get('/api/reportes/mayor', async (req, res) => {
  const cuentas = await Cuenta.findAll({ order: [['codigo', 'ASC']] });
  res.json(cuentas);
});

const PORT = 3001;
app.listen(PORT, () => console.log(`Backend MINI running on http://localhost:${PORT}`));
