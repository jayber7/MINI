const express = require('express');
const router = express.Router();
const exportController = require('../controllers/export.controller');
const reporteController = require('../controllers/reporte.controller');
const authMiddleware = require('../middleware/auth');
const { requirePermisos } = require('../middleware/roles');
const { Gestion } = require('../models');

async function resolverFechas(desde, hasta, gestionId) {
  if (gestionId) {
    const gestion = await Gestion.findByPk(gestionId);
    if (gestion) return { desde: gestion.fechaInicio, hasta: gestion.fechaFin };
  }
  return { desde, hasta };
}

router.use(authMiddleware);
router.use(requirePermisos('reportes:export'));

// Comprobante PDF
router.get('/comprobante/:id/pdf', exportController.exportarComprobantePDF);

// Reportes PDF
router.get('/libro-diario/pdf', async (req, res) => {
  const { desde, hasta, gestionId } = req.query;
  const fechas = await resolverFechas(desde, hasta, gestionId);
  const datos = await reporteController.obtenerLibroDiario(fechas.desde, fechas.hasta);
  const formateados = datos.map(comp => ({
    titulo: `Comprobante Nº ${String(comp.numero).padStart(4, '0')} - ${comp.fecha} - ${comp.glosa}`,
    headers: ['Cuenta', 'Descripción', 'Debe', 'Haber'],
    colWidths: [80, 250, 100, 100],
    tabla: comp.detalles.map(d => [
      `${d.cuentaCodigo}`,
      `${d.cuentaNombre}${d.glosa ? ` - ${d.glosa}` : ''}`,
      d.debe > 0 ? d.debe : '',
      d.haber > 0 ? d.haber : '',
    ]),
    totales: ['', 'TOTALES', comp.totalDebe, comp.totalHaber],
  }));
  exportController.exportarTablaPDF(req, res, 'Libro Diario', () => Promise.resolve(formateados));
});

router.get('/libro-mayor/pdf', async (req, res) => {
  const { desde, hasta, codigoCuenta, gestionId } = req.query;
  const fechas = await resolverFechas(desde, hasta, gestionId);
  const datos = await reporteController.obtenerLibroMayor(fechas.desde, fechas.hasta, codigoCuenta);
  const formateados = datos.map(cuenta => ({
    titulo: `${cuenta.codigo} - ${cuenta.nombre} (${cuenta.tipo}) - Saldo: ${cuenta.saldo.toFixed(2)}`,
    headers: ['Fecha', 'Nº', 'Glosa', 'Debe', 'Haber'],
    colWidths: [80, 60, 200, 100, 100],
    tabla: cuenta.movimientos.map(m => [
      m.fecha,
      String(m.numero).padStart(4, '0'),
      m.glosa || '',
      m.debe > 0 ? m.debe : '',
      m.haber > 0 ? m.haber : '',
    ]),
    totales: ['', '', 'TOTALES', cuenta.totalDebe, cuenta.totalHaber],
  }));
  exportController.exportarTablaPDF(req, res, 'Libro Mayor', () => Promise.resolve(formateados));
});

router.get('/balance-general/pdf', async (req, res) => {
  const { desde, hasta, gestionId } = req.query;
  const fechas = await resolverFechas(desde, hasta, gestionId);
  const datos = await reporteController.obtenerBalanceGeneral(fechas.desde, fechas.hasta);
  const resultado = [];

  resultado.push({
    titulo: 'ACTIVO',
    headers: ['Código', 'Cuenta', 'Saldo', ''],
    colWidths: [80, 300, 100, 100],
    tabla: datos.activo.cuentas.map(c => [c.codigo, c.nombre, c.saldo, '']),
    totales: ['', 'TOTAL ACTIVO', datos.activo.total, ''],
  });

  resultado.push({
    titulo: 'PASIVO',
    headers: ['Código', 'Cuenta', 'Saldo', ''],
    colWidths: [80, 300, 100, 100],
    tabla: datos.pasivo.cuentas.map(c => [c.codigo, c.nombre, c.saldo, '']),
    totales: ['', 'TOTAL PASIVO', datos.pasivo.total, ''],
  });

  resultado.push({
    titulo: 'PATRIMONIO',
    headers: ['Código', 'Cuenta', 'Saldo', ''],
    colWidths: [80, 300, 100, 100],
    tabla: [
      ...datos.patrimonio.cuentas.map(c => [c.codigo, c.nombre, c.saldo, '']),
      ['3.3', 'Resultado del Ejercicio', datos.utilidadEjercicio, ''],
    ],
    totales: ['', 'TOTAL PATRIMONIO', datos.patrimonio.total, ''],
  });

  exportController.exportarTablaPDF(req, res, 'Balance General', () => Promise.resolve(resultado));
});

router.get('/estado-resultados/pdf', async (req, res) => {
  const { desde, hasta, gestionId } = req.query;
  const fechas = await resolverFechas(desde, hasta, gestionId);
  const datos = await reporteController.obtenerEstadoResultados(fechas.desde, fechas.hasta);
  const resultado = [];

  resultado.push({
    titulo: 'INGRESOS',
    headers: ['Código', 'Cuenta', 'Saldo', ''],
    colWidths: [80, 300, 100, 100],
    tabla: datos.ingresos.cuentas.map(c => [c.codigo, c.nombre, c.saldo, '']),
    totales: ['', 'TOTAL INGRESOS', datos.ingresos.total, ''],
  });

  resultado.push({
    titulo: 'GASTOS',
    headers: ['Código', 'Cuenta', 'Saldo', ''],
    colWidths: [80, 300, 100, 100],
    tabla: datos.gastos.cuentas.map(c => [c.codigo, c.nombre, c.saldo, '']),
    totales: ['', 'TOTAL GASTOS', datos.gastos.total, ''],
  });

  resultado.push({
    titulo: datos.utilidad >= 0 ? 'UTILIDAD NETA' : 'PÉRDIDA NETA',
    headers: ['', '', 'Total', ''],
    colWidths: [80, 300, 100, 100],
    tabla: [],
    totales: ['', '', Math.abs(datos.utilidad), ''],
  });

  exportController.exportarTablaPDF(req, res, 'Estado de Resultados', () => Promise.resolve(resultado));
});

router.get('/evolucion-patrimonio/pdf', async (req, res) => {
  const { desde, hasta, gestionId } = req.query;
  const fechas = await resolverFechas(desde, hasta, gestionId);
  const datos = await reporteController.obtenerEvolucionPatrimonio(fechas.desde, fechas.hasta);
  const resultado = [{
    titulo: 'PATRIMONIO',
    headers: ['Código', 'Cuenta', 'Saldo', ''],
    colWidths: [80, 300, 100, 100],
    tabla: [
      ...datos.detalle.map(c => [c.codigo, c.nombre, c.saldo, '']),
      ['', 'Patrimonio Inicial', datos.patrimonioInicial, ''],
      ['', datos.utilidad >= 0 ? '(+) Utilidad del Ejercicio' : '(-) Pérdida del Ejercicio', Math.abs(datos.utilidad), ''],
    ],
    totales: ['', 'PATRIMONIO FINAL', datos.patrimonioFinal, ''],
  }];
  exportController.exportarTablaPDF(req, res, 'Evolución del Patrimonio', () => Promise.resolve(resultado));
});

router.get('/sumas-saldos/pdf', async (req, res) => {
  const { desde, hasta, gestionId } = req.query;
  const fechas = await resolverFechas(desde, hasta, gestionId);
  const datos = await reporteController.obtenerSumasSaldos(fechas.desde, fechas.hasta);
  const resultado = [{
    titulo: 'SUMAS Y SALDOS',
    headers: ['Código', 'Cuenta', 'Suma Debe', 'Suma Haber', 'Saldo Deudor', 'Saldo Acreedor'],
    colWidths: [60, 200, 80, 80, 80, 80],
    tabla: datos.cuentas.map(c => [
      c.codigo,
      c.nombre,
      c.sumaDebe > 0 ? c.sumaDebe : '',
      c.sumaHaber > 0 ? c.sumaHaber : '',
      c.saldoDeudor > 0 ? c.saldoDeudor : '',
      c.saldoAcreedor > 0 ? c.saldoAcreedor : '',
    ]),
    totales: ['', 'TOTALES', datos.totales.sumaDebe, datos.totales.sumaHaber, datos.totales.saldoDeudor, datos.totales.saldoAcreedor],
  }];
  exportController.exportarTablaPDF(req, res, 'Balance de Sumas y Saldos', () => Promise.resolve(resultado));
});

// Reportes Excel
router.get('/libro-diario/excel', async (req, res) => {
  const { desde, hasta, gestionId } = req.query;
  const fechas = await resolverFechas(desde, hasta, gestionId);
  const datos = await reporteController.obtenerLibroDiario(fechas.desde, fechas.hasta);
  const formateados = datos.map(comp => ({
    titulo: `Comprobante Nº ${String(comp.numero).padStart(4, '0')} - ${comp.fecha} - ${comp.glosa}`,
    headers: ['Cuenta', 'Descripción', 'Debe', 'Haber'],
    tabla: comp.detalles.map(d => [
      `${d.cuentaCodigo}`,
      `${d.cuentaNombre}${d.glosa ? ` - ${d.glosa}` : ''}`,
      d.debe,
      d.haber,
    ]),
    totales: ['', 'TOTALES', comp.totalDebe, comp.totalHaber],
  }));
  exportController.exportarExcelGenerico(req, res, 'Libro Diario', () => Promise.resolve(formateados));
});

router.get('/libro-mayor/excel', async (req, res) => {
  const { desde, hasta, codigoCuenta, gestionId } = req.query;
  const fechas = await resolverFechas(desde, hasta, gestionId);
  const datos = await reporteController.obtenerLibroMayor(fechas.desde, fechas.hasta, codigoCuenta);
  const formateados = datos.map(cuenta => ({
    titulo: `${cuenta.codigo} - ${cuenta.nombre} (${cuenta.tipo})`,
    headers: ['Fecha', 'Nº', 'Glosa', 'Debe', 'Haber'],
    tabla: cuenta.movimientos.map(m => [
      m.fecha,
      String(m.numero).padStart(4, '0'),
      m.glosa || '',
      m.debe,
      m.haber,
    ]),
    totales: ['', '', 'TOTALES', cuenta.totalDebe, cuenta.totalHaber],
  }));
  exportController.exportarExcelGenerico(req, res, 'Libro Mayor', () => Promise.resolve(formateados));
});

router.get('/balance-general/excel', async (req, res) => {
  const { desde, hasta, gestionId } = req.query;
  const fechas = await resolverFechas(desde, hasta, gestionId);
  const datos = await reporteController.obtenerBalanceGeneral(fechas.desde, fechas.hasta);
  const resultado = [];

  resultado.push({
    titulo: 'ACTIVO',
    headers: ['Código', 'Cuenta', 'Saldo'],
    tabla: datos.activo.cuentas.map(c => [c.codigo, c.nombre, c.saldo]),
    totales: ['', 'TOTAL ACTIVO', datos.activo.total],
  });

  resultado.push({
    titulo: 'PASIVO',
    headers: ['Código', 'Cuenta', 'Saldo'],
    tabla: datos.pasivo.cuentas.map(c => [c.codigo, c.nombre, c.saldo]),
    totales: ['', 'TOTAL PASIVO', datos.pasivo.total],
  });

  resultado.push({
    titulo: 'PATRIMONIO',
    headers: ['Código', 'Cuenta', 'Saldo'],
    tabla: [
      ...datos.patrimonio.cuentas.map(c => [c.codigo, c.nombre, c.saldo]),
      ['3.3', 'Resultado del Ejercicio', datos.utilidadEjercicio],
    ],
    totales: ['', 'TOTAL PATRIMONIO', datos.patrimonio.total],
  });

  exportController.exportarExcelGenerico(req, res, 'Balance General', () => Promise.resolve(resultado));
});

router.get('/estado-resultados/excel', async (req, res) => {
  const { desde, hasta, gestionId } = req.query;
  const fechas = await resolverFechas(desde, hasta, gestionId);
  const datos = await reporteController.obtenerEstadoResultados(fechas.desde, fechas.hasta);
  const resultado = [];

  resultado.push({
    titulo: 'INGRESOS',
    headers: ['Código', 'Cuenta', 'Saldo'],
    tabla: datos.ingresos.cuentas.map(c => [c.codigo, c.nombre, c.saldo]),
    totales: ['', 'TOTAL INGRESOS', datos.ingresos.total],
  });

  resultado.push({
    titulo: 'GASTOS',
    headers: ['Código', 'Cuenta', 'Saldo'],
    tabla: datos.gastos.cuentas.map(c => [c.codigo, c.nombre, c.saldo]),
    totales: ['', 'TOTAL GASTOS', datos.gastos.total],
  });

  resultado.push({
    titulo: datos.utilidad >= 0 ? 'UTILIDAD NETA' : 'PÉRDIDA NETA',
    headers: ['', 'Concepto', 'Total'],
    tabla: [],
    totales: ['', '', Math.abs(datos.utilidad)],
  });

  exportController.exportarExcelGenerico(req, res, 'Estado de Resultados', () => Promise.resolve(resultado));
});

router.get('/evolucion-patrimonio/excel', async (req, res) => {
  const { desde, hasta, gestionId } = req.query;
  const fechas = await resolverFechas(desde, hasta, gestionId);
  const datos = await reporteController.obtenerEvolucionPatrimonio(fechas.desde, fechas.hasta);
  const resultado = [{
    titulo: 'PATRIMONIO',
    headers: ['Código', 'Cuenta', 'Saldo'],
    tabla: [
      ...datos.detalle.map(c => [c.codigo, c.nombre, c.saldo]),
      ['', 'Patrimonio Inicial', datos.patrimonioInicial],
      ['', datos.utilidad >= 0 ? '(+) Utilidad del Ejercicio' : '(-) Pérdida del Ejercicio', Math.abs(datos.utilidad)],
    ],
    totales: ['', 'PATRIMONIO FINAL', datos.patrimonioFinal],
  }];
  exportController.exportarExcelGenerico(req, res, 'Evolución del Patrimonio', () => Promise.resolve(resultado));
});

router.get('/sumas-saldos/excel', async (req, res) => {
  const { desde, hasta, gestionId } = req.query;
  const fechas = await resolverFechas(desde, hasta, gestionId);
  const datos = await reporteController.obtenerSumasSaldos(fechas.desde, fechas.hasta);
  const resultado = [{
    titulo: 'SUMAS Y SALDOS',
    headers: ['Código', 'Cuenta', 'Suma Debe', 'Suma Haber', 'Saldo Deudor', 'Saldo Acreedor'],
    tabla: datos.cuentas.map(c => [
      c.codigo,
      c.nombre,
      c.sumaDebe,
      c.sumaHaber,
      c.saldoDeudor,
      c.saldoAcreedor,
    ]),
    totales: ['', 'TOTALES', datos.totales.sumaDebe, datos.totales.sumaHaber, datos.totales.saldoDeudor, datos.totales.saldoAcreedor],
  }];
  exportController.exportarExcelGenerico(req, res, 'Balance de Sumas y Saldos', () => Promise.resolve(resultado));
});

module.exports = router;
