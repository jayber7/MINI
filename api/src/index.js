require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { sequelize } = require('./models');
const {
  authRoutes,
  usuariosRoutes,
  rolesRoutes,
  empresaRoutes,
  planRoutes,
  comprobanteRoutes,
  gestionRoutes,
  proyectoRoutes,
  reporteRoutes,
  exportRoutes,
  retencionRoutes,
  compraRoutes,
  ventaRoutes,
} = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const seed = require('./seeds/seed');

const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));
app.use(express.json());

app.use((req, res, next) => {
  req.models = require('./models');
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/empresa', empresaRoutes);
app.use('/api/plan-cuentas', planRoutes);
app.use('/api/comprobantes', comprobanteRoutes);
app.use('/api/gestiones', gestionRoutes);
app.use('/api/proyectos', proyectoRoutes);
app.use('/api/reportes', reporteRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/retenciones', retencionRoutes);
app.use('/api/compras', compraRoutes);
app.use('/api/ventas', ventaRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.use(errorHandler);

async function start() {
  try {
    await sequelize.authenticate();
    console.log('Conexión a SQLite establecida');

    await sequelize.sync();
    console.log('Base de datos sincronizada');

    await seed();

    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => {
      console.log(`Backend EICAP MINI corriendo en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Error al iniciar el servidor:', error);
    process.exit(1);
  }
}

start();
