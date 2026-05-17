const { Empresa, Gestion, PlanCuenta, Comprobante, ComprobanteDetalle, Usuario, Compra, Venta, Retencion } = require('../models');

function bs(n) { return Math.round(n * 100) / 100; }

let _numeroComprobante = 0;

async function crearComprobanteDirecto(gestionId, empresaId, usuarioId, tipo, glosa, fecha, lineas) {
  _numeroComprobante++;
  const comp = await Comprobante.create({
    numero: _numeroComprobante, tipoComprobante: tipo, glosa, fecha, estado: 'activo',
    gestionId, empresaId, usuarioIdCrea: usuarioId,
  });

  const detalles = lineas.map((l) => ({
    comprobanteId: comp.id,
    planCuentaId: l.cuentaId,
    glosa: l.glosa || glosa,
    debe: bs(l.debe || 0),
    haber: bs(l.haber || 0),
  }));

  await ComprobanteDetalle.bulkCreate(detalles);
  return comp;
}

async function crearYContabilizarCompra(gestionId, empresaId, usuarioId, compraData, lineasPersonalizadas) {
  const compra = await Compra.create({ ...compraData, empresaId });

  const importeTotal = parseFloat(compra.importeTotal);
  const descuentos = parseFloat(compra.descuentos) || 0;
  const importeNoSujeto = parseFloat(compra.importeNoSujeto) || 0;
  const baseImponible = importeTotal - descuentos - importeNoSujeto;
  const creditoFiscal = Math.round(baseImponible * 0.13 * 100) / 100;
  const neto = Math.round(baseImponible * 0.87 * 100) / 100;

  const cuentaCreditoFiscal = await PlanCuenta.findOne({ where: { codigo: '1.1.5.1', empresaId } });
  const cuentaGasto = await PlanCuenta.findOne({ where: { codigo: '5.1.1', empresaId } });
  const cuentaPorPagar = await PlanCuenta.findOne({ where: { codigo: '2.1.1.1', empresaId } });

  if (!cuentaCreditoFiscal || !cuentaGasto || !cuentaPorPagar) {
    throw new Error('Cuentas contables para compras no encontradas');
  }

  _numeroComprobante++;
  const comprobante = await Comprobante.create({
    numero: _numeroComprobante,
    tipoComprobante: 'egreso',
    glosa: compra.glosa || `Compra Nº ${compra.numeroCompra} - ${compra.razonSocial}`,
    fecha: compra.fecha,
    estado: 'activo',
    gestionId, empresaId, usuarioIdCrea: usuarioId,
  });

  let detalles;
  if (lineasPersonalizadas) {
    detalles = lineasPersonalizadas.map((l) => ({
      comprobanteId: comprobante.id,
      planCuentaId: l.cuentaId,
      glosa: l.glosa || compra.glosa,
      debe: bs(l.debe || 0),
      haber: bs(l.haber || 0),
    }));
  } else {
    detalles = [
      { comprobanteId: comprobante.id, planCuentaId: cuentaCreditoFiscal.id, glosa: 'Crédito Fiscal IVA 13%', debe: creditoFiscal, haber: 0 },
      { comprobanteId: comprobante.id, planCuentaId: cuentaGasto.id, glosa: 'Compra mercadería', debe: neto, haber: 0 },
      { comprobanteId: comprobante.id, planCuentaId: cuentaPorPagar.id, glosa: `Compra a ${compra.razonSocial}`, debe: 0, haber: bs(importeTotal - descuentos) },
    ];
  }

  await ComprobanteDetalle.bulkCreate(detalles);
  await compra.update({ contabilizado: true, comprobanteId: comprobante.id });
  return { compra, comprobante };
}

async function crearYContabilizarVenta(gestionId, empresaId, usuarioId, ventaData, lineasPersonalizadas) {
  const venta = await Venta.create({ ...ventaData, empresaId });

  const importeTotal = parseFloat(venta.importeTotal);
  const descuentos = parseFloat(venta.descuentos) || 0;
  const importeExento = parseFloat(venta.importeExento) || 0;
  const baseImponible = importeTotal - descuentos - importeExento;
  const debitoFiscal = Math.round(baseImponible * 0.13 / 1.13 * 100) / 100;
  const ventaNeta = Math.round(baseImponible / 1.13 * 100) / 100;
  const it = Math.round(baseImponible * 0.03 * 100) / 100;

  const cuentaCaja = await PlanCuenta.findOne({ where: { codigo: '1.1.1.1', empresaId } });
  const cuentaVenta = await PlanCuenta.findOne({ where: { codigo: '4.1.1.1', empresaId } });
  const cuentaDebitoFiscal = await PlanCuenta.findOne({ where: { codigo: '2.1.3.1', empresaId } });
  const cuentaIT = await PlanCuenta.findOne({ where: { codigo: '2.1.3.2', empresaId } });

  if (!cuentaCaja || !cuentaVenta || !cuentaDebitoFiscal || !cuentaIT) {
    throw new Error('Cuentas contables para ventas no encontradas');
  }

  _numeroComprobante++;
  const comprobante = await Comprobante.create({
    numero: _numeroComprobante,
    tipoComprobante: 'ingreso',
    glosa: venta.glosa || `Venta Nº ${venta.numeroVenta} - ${venta.razonSocial || 'Contado'}`,
    fecha: venta.fecha,
    estado: 'activo',
    gestionId, empresaId, usuarioIdCrea: usuarioId,
  });

  let detalles;
  if (lineasPersonalizadas) {
    detalles = lineasPersonalizadas.map((l) => ({
      comprobanteId: comprobante.id,
      planCuentaId: l.cuentaId,
      glosa: l.glosa || venta.glosa,
      debe: bs(l.debe || 0),
      haber: bs(l.haber || 0),
    }));
  } else {
    detalles = [
      { comprobanteId: comprobante.id, planCuentaId: cuentaCaja.id, glosa: 'Cobro en caja', debe: importeTotal, haber: 0 },
      { comprobanteId: comprobante.id, planCuentaId: cuentaVenta.id, glosa: 'Venta mercadería', debe: 0, haber: ventaNeta },
      { comprobanteId: comprobante.id, planCuentaId: cuentaDebitoFiscal.id, glosa: 'Débito Fiscal IVA', debe: 0, haber: debitoFiscal },
      { comprobanteId: comprobante.id, planCuentaId: cuentaIT.id, glosa: 'IT 3%', debe: 0, haber: it },
    ];
  }

  await ComprobanteDetalle.bulkCreate(detalles);
  await venta.update({ contabilizado: true, comprobanteId: comprobante.id });
  return { venta, comprobante };
}

async function crearYContabilizarRetencion(gestionId, empresaId, usuarioId, retencionData) {
  const retencion = await Retencion.create({ ...retencionData, empresaId });

  const montoBase = parseFloat(retencion.montoBase);
  const montoRetenido = Math.round(montoBase * (parseFloat(retencion.porcentaje) / 100) * 100) / 100;

  const cuentaGasto = await PlanCuenta.findOne({ where: { codigo: '5.2.1', empresaId } });
  const cuentaRetencion = await PlanCuenta.findOne({ where: { codigo: '1.1.5.3', empresaId } });
  const cuentaPorPagar = await PlanCuenta.findOne({ where: { codigo: '2.1.1.1', empresaId } });

  if (!cuentaGasto || !cuentaRetencion || !cuentaPorPagar) {
    throw new Error('Cuentas contables para retenciones no encontradas');
  }

  _numeroComprobante++;
  const comprobante = await Comprobante.create({
    numero: _numeroComprobante,
    tipoComprobante: 'egreso',
    glosa: `Retención ${retencion.tipoRetencion} - ${retencion.tipoRetencion === 'RC-IVA' ? '8%' : '12.5%'}`,
    fecha: retencion.fecha,
    estado: 'activo',
    gestionId, empresaId, usuarioIdCrea: usuarioId,
  });

  const detalles = [
    { comprobanteId: comprobante.id, planCuentaId: cuentaGasto.id, glosa: retencion.glosa || 'Retención', debe: montoRetenido, haber: 0 },
    { comprobanteId: comprobante.id, planCuentaId: cuentaRetencion.id, glosa: `${retencion.tipoRetencion} retenido`, debe: 0, haber: montoRetenido },
  ];

  await ComprobanteDetalle.bulkCreate(detalles);
  await retencion.update({ contabilizado: true, comprobanteId: comprobante.id });
  return { retencion, comprobante };
}

async function seedZapateria() {
  console.log('\n=== Sembrando datos: Zapatería Elegante SRL ===\n');

  const empresa = await Empresa.findOne({ where: { nombre: 'Zapatería Elegante SRL' } });
  if (empresa) {
    const gestionExistente = await Gestion.findOne({ where: { year: 2025, empresaId: empresa.id } });
    if (gestionExistente) {
      console.log('Zapatería Elegante SRL ya tiene datos sembrados, saltando.');
      return;
    }
  }

  const empresaData = await Empresa.findOne();
  if (!empresaData) {
    console.log('No hay empresa base. Ejecuta el seed principal primero.');
    return;
  }

  const adminUser = await Usuario.findOne({ where: { username: 'admin' } });
  const usuarioId = adminUser ? adminUser.id : 1;

  await empresaData.update({
    nombre: 'Zapatería Elegante SRL',
    nit: '5012345678',
    direccion: 'Calle Comercio #456, Zona Central, La Paz',
    telefono: '+591 2 2345678',
    tituloContador: 'Lic. en Contaduría',
    firmaContador: 'Carlos Mamani Quispe',
    tituloPropietario: 'Gerente General',
    firmaPropietario: 'María Elena Torres de Rojas',
    tituloRepresentanteLegal: 'Representante Legal',
    firmaRepresentanteLegal: 'Roberto Rojas Fernández',
  });

  const empresaId = empresaData.id;

  const gestion2025 = await Gestion.create({
    year: 2025, glosa: 'Gestión Fiscal 2025',
    fechaInicio: '2025-01-01', fechaFin: '2025-12-31',
    actividad: 'Comercial', empresaId,
  });

  const gestion2026 = await Gestion.create({
    year: 2026, glosa: 'Gestión Fiscal 2026',
    fechaInicio: '2026-01-01', fechaFin: '2026-12-31',
    actividad: 'Comercial', empresaId,
  });

  await empresaData.update({ gestionActualId: gestion2026.id });

  const cuentas = await PlanCuenta.findAll({ where: { empresaId } });
  const getCuenta = (codigo) => {
    const c = cuentas.find((x) => x.codigo === codigo);
    if (!c) throw new Error(`Cuenta ${codigo} no encontrada`);
    return c.id;
  };

  let numCompras2025 = 0, numVentas2025 = 0, numRetenciones2025 = 0;
  let numCompras2026 = 0, numVentas2026 = 0, numRetenciones2026 = 0;
  let numDirectos2025 = 0, numDirectos2026 = 0;

  // =========================================================================
  // GESTIÓN 2025
  // =========================================================================
  console.log('Sembrando Gestión 2025...');

  // --- ENERO 2025 ---

  // 1. Aporte de capital (directo)
  await crearComprobanteDirecto(gestion2025.id, empresaId, usuarioId, 'ingreso',
    'Aporte inicial de capital social - María Elena Torres', '2025-01-02', [
      { cuentaId: getCuenta('1.1.2.1'), debe: 100000, haber: 0, glosa: 'Depósito en Banco Unión' },
      { cuentaId: getCuenta('1.1.1.1'), debe: 50000, haber: 0, glosa: 'Efectivo en caja' },
      { cuentaId: getCuenta('3.1.1'), debe: 0, haber: 150000, glosa: 'Capital social suscrito' },
    ]);
  numDirectos2025++;

  // 2. Compra inventario inicial → Compra
  await crearYContabilizarCompra(gestion2025.id, empresaId, usuarioId, {
    fecha: '2025-01-05', nit: '1023456789', razonSocial: 'Distribuidora Calzado Bolivia',
    numeroCompra: 'FAC-001', numeroDui: '0', importeTotal: 46000,
    importeNoSujeto: 0, descuentos: 0, tipo: 'interno',
    glosa: 'Compra inventario inicial - Distribuidora Calzado Bolivia',
  }, [
    { cuentaId: getCuenta('1.1.5.1'), debe: 5980, haber: 0, glosa: 'Crédito Fiscal IVA 13%' },
    { cuentaId: getCuenta('1.1.3.1'), debe: 40020, haber: 0, glosa: 'Compra mercaderías (zapatos)' },
    { cuentaId: getCuenta('2.1.1.1'), debe: 0, haber: 46000, glosa: 'Cuenta por pagar proveedor' },
  ]);
  numCompras2025++;

  // 3. Compra mobiliario → Compra
  await crearYContabilizarCompra(gestion2025.id, empresaId, usuarioId, {
    fecha: '2025-01-08', nit: '2034567890', razonSocial: 'Mueblería El Hogar SRL',
    numeroCompra: 'FAC-002', numeroDui: '0', importeTotal: 20000,
    importeNoSujeto: 0, descuentos: 0, tipo: 'interno',
    glosa: 'Compra mobiliario y equipo para tienda',
  }, [
    { cuentaId: getCuenta('1.1.5.1'), debe: 2600, haber: 0, glosa: 'Crédito Fiscal IVA' },
    { cuentaId: getCuenta('1.2.1.1'), debe: 17400, haber: 0, glosa: 'Mobiliario de oficina y vitrinas' },
    { cuentaId: getCuenta('2.1.1.1'), debe: 0, haber: 20000, glosa: 'Cuenta por pagar' },
  ]);
  numCompras2025++;

  // 4. Pago alquiler enero (directo)
  await crearComprobanteDirecto(gestion2025.id, empresaId, usuarioId, 'egreso',
    'Pago alquiler local comercial enero 2025', '2025-01-10', [
      { cuentaId: getCuenta('5.2.2'), debe: 3500, haber: 0, glosa: 'Alquiler local' },
      { cuentaId: getCuenta('1.1.1.1'), debe: 0, haber: 3500, glosa: 'Pago en efectivo' },
    ]);
  numDirectos2025++;

  // 5. Venta contado → Venta
  await crearYContabilizarVenta(gestion2025.id, empresaId, usuarioId, {
    fecha: '2025-01-15', nit: '0', razonSocial: 'Ventas Contado',
    numeroVenta: '001-001', importeTotal: 8700,
    importeExento: 0, descuentos: 0, tipo: 'interno',
    glosa: 'Ventas contado primera quincena enero',
  }, [
    { cuentaId: getCuenta('1.1.1.1'), debe: 8700, haber: 0, glosa: 'Cobro en caja' },
    { cuentaId: getCuenta('4.1.1.1'), debe: 0, haber: 7500, glosa: 'Ventas zap. caballero' },
    { cuentaId: getCuenta('2.1.3.1'), debe: 0, haber: 975, glosa: 'Débito Fiscal IVA' },
    { cuentaId: getCuenta('2.1.3.2'), debe: 0, haber: 225, glosa: 'IT 3%' },
  ]);
  numVentas2025++;

  // 6. Sueldos enero (directo)
  await crearComprobanteDirecto(gestion2025.id, empresaId, usuarioId, 'egreso',
    'Pago planilla enero 2025', '2025-01-31', [
      { cuentaId: getCuenta('5.2.1'), debe: 14000, haber: 0, glosa: 'Sueldos y salarios' },
      { cuentaId: getCuenta('1.1.1.1'), debe: 0, haber: 14000, glosa: 'Pago planilla' },
    ]);
  numDirectos2025++;

  // 7. Servicios básicos enero (directo)
  await crearComprobanteDirecto(gestion2025.id, empresaId, usuarioId, 'egreso',
    'Pago servicios básicos enero', '2025-01-31', [
      { cuentaId: getCuenta('5.2.3'), debe: 450, haber: 0, glosa: 'Luz, agua, teléfono' },
      { cuentaId: getCuenta('1.1.1.1'), debe: 0, haber: 450, glosa: 'Pago servicios' },
    ]);
  numDirectos2025++;

  // --- FEBRERO 2025 ---

  // 8. Compra mercadería → Compra
  await crearYContabilizarCompra(gestion2025.id, empresaId, usuarioId, {
    fecha: '2025-02-03', nit: '3045678901', razonSocial: 'Importadora Footwear SRL',
    numeroCompra: 'FAC-003', numeroDui: '0', importeTotal: 34000,
    importeNoSujeto: 0, descuentos: 0, tipo: 'interno',
    glosa: 'Compra mercadería - Importadora Footwear SRL',
  }, [
    { cuentaId: getCuenta('1.1.5.1'), debe: 4420, haber: 0, glosa: 'Crédito Fiscal IVA' },
    { cuentaId: getCuenta('1.1.3.1'), debe: 29580, haber: 0, glosa: 'Compra calzado deportivo' },
    { cuentaId: getCuenta('2.1.1.1'), debe: 0, haber: 34000, glosa: 'Transferencia bancaria' },
  ]);
  numCompras2025++;

  // 9. Venta contado → Venta
  await crearYContabilizarVenta(gestion2025.id, empresaId, usuarioId, {
    fecha: '2025-02-15', nit: '0', razonSocial: 'Ventas Contado',
    numeroVenta: '001-002', importeTotal: 10440,
    importeExento: 0, descuentos: 0, tipo: 'interno',
    glosa: 'Ventas contado febrero 1ra quincena',
  }, [
    { cuentaId: getCuenta('1.1.1.1'), debe: 10440, haber: 0 },
    { cuentaId: getCuenta('4.1.1.1'), debe: 0, haber: 9000, glosa: 'Ventas zap. caballero' },
    { cuentaId: getCuenta('2.1.3.1'), debe: 0, haber: 1170, glosa: 'Débito Fiscal IVA' },
    { cuentaId: getCuenta('2.1.3.2'), debe: 0, haber: 270, glosa: 'IT 3%' },
  ]);
  numVentas2025++;

  // 10. Venta contado 2da quincena → Venta
  await crearYContabilizarVenta(gestion2025.id, empresaId, usuarioId, {
    fecha: '2025-02-28', nit: '0', razonSocial: 'Ventas Contado',
    numeroVenta: '001-003', importeTotal: 9280,
    importeExento: 0, descuentos: 0, tipo: 'interno',
    glosa: 'Ventas contado febrero 2da quincena',
  }, [
    { cuentaId: getCuenta('1.1.1.1'), debe: 9280, haber: 0 },
    { cuentaId: getCuenta('4.1.1.2'), debe: 0, haber: 8000, glosa: 'Ventas zap. dama' },
    { cuentaId: getCuenta('2.1.3.1'), debe: 0, haber: 1040, glosa: 'Débito Fiscal IVA' },
    { cuentaId: getCuenta('2.1.3.2'), debe: 0, haber: 240, glosa: 'IT 3%' },
  ]);
  numVentas2025++;

  // 11. Alquiler febrero (directo)
  await crearComprobanteDirecto(gestion2025.id, empresaId, usuarioId, 'egreso',
    'Pago alquiler febrero 2025', '2025-02-10', [
      { cuentaId: getCuenta('5.2.2'), debe: 3500, haber: 0 },
      { cuentaId: getCuenta('1.1.1.1'), debe: 0, haber: 3500 },
    ]);
  numDirectos2025++;

  // 12. Sueldos febrero (directo)
  await crearComprobanteDirecto(gestion2025.id, empresaId, usuarioId, 'egreso',
    'Pago planilla febrero 2025', '2025-02-28', [
      { cuentaId: getCuenta('5.2.1'), debe: 14000, haber: 0 },
      { cuentaId: getCuenta('1.1.1.1'), debe: 0, haber: 14000 },
    ]);
  numDirectos2025++;

  // 13. Servicios febrero (directo)
  await crearComprobanteDirecto(gestion2025.id, empresaId, usuarioId, 'egreso',
    'Pago servicios básicos febrero', '2025-02-28', [
      { cuentaId: getCuenta('5.2.3'), debe: 380, haber: 0 },
      { cuentaId: getCuenta('1.1.1.1'), debe: 0, haber: 380 },
    ]);
  numDirectos2025++;

  // 14. Pago IVA enero (directo)
  await crearComprobanteDirecto(gestion2025.id, empresaId, usuarioId, 'egreso',
    'Pago IVA período enero 2025', '2025-02-20', [
      { cuentaId: getCuenta('2.1.3.1'), debe: 975, haber: 0, glosa: 'Débito Fiscal IVA' },
      { cuentaId: getCuenta('1.1.2.1'), debe: 0, haber: 975, glosa: 'Pago banco' },
    ]);
  numDirectos2025++;

  // --- MARZO 2025 ---

  await crearYContabilizarCompra(gestion2025.id, empresaId, usuarioId, {
    fecha: '2025-03-04', nit: '1023456789', razonSocial: 'Distribuidora Calzado Bolivia',
    numeroCompra: 'FAC-004', numeroDui: '0', importeTotal: 40000,
    importeNoSujeto: 0, descuentos: 0, tipo: 'interno',
    glosa: 'Compra mercadería - Distribuidora Calzado Bolivia',
  }, [
    { cuentaId: getCuenta('1.1.5.1'), debe: 5200, haber: 0 },
    { cuentaId: getCuenta('1.1.3.1'), debe: 34800, haber: 0 },
    { cuentaId: getCuenta('2.1.1.1'), debe: 0, haber: 40000 },
  ]);
  numCompras2025++;

  await crearYContabilizarVenta(gestion2025.id, empresaId, usuarioId, {
    fecha: '2025-03-15', nit: '0', razonSocial: 'Ventas Contado',
    numeroVenta: '001-004', importeTotal: 11600,
    importeExento: 0, descuentos: 0, tipo: 'interno',
    glosa: 'Ventas contado marzo 1ra quincena',
  }, [
    { cuentaId: getCuenta('1.1.1.1'), debe: 11600, haber: 0 },
    { cuentaId: getCuenta('4.1.1.1'), debe: 0, haber: 10000, glosa: 'Ventas zap. caballero' },
    { cuentaId: getCuenta('2.1.3.1'), debe: 0, haber: 1300, glosa: 'Débito Fiscal IVA' },
    { cuentaId: getCuenta('2.1.3.2'), debe: 0, haber: 300, glosa: 'IT 3%' },
  ]);
  numVentas2025++;

  await crearYContabilizarVenta(gestion2025.id, empresaId, usuarioId, {
    fecha: '2025-03-31', nit: '0', razonSocial: 'Ventas Contado',
    numeroVenta: '001-005', importeTotal: 13920,
    importeExento: 0, descuentos: 0, tipo: 'interno',
    glosa: 'Ventas contado marzo 2da quincena',
  }, [
    { cuentaId: getCuenta('1.1.1.1'), debe: 13920, haber: 0 },
    { cuentaId: getCuenta('4.1.1.2'), debe: 0, haber: 12000, glosa: 'Ventas zap. dama' },
    { cuentaId: getCuenta('2.1.3.1'), debe: 0, haber: 1560, glosa: 'Débito Fiscal IVA' },
    { cuentaId: getCuenta('2.1.3.2'), debe: 0, haber: 360, glosa: 'IT 3%' },
  ]);
  numVentas2025++;

  await crearComprobanteDirecto(gestion2025.id, empresaId, usuarioId, 'egreso',
    'Pago alquiler marzo 2025', '2025-03-10', [
      { cuentaId: getCuenta('5.2.2'), debe: 3500, haber: 0 },
      { cuentaId: getCuenta('1.1.1.1'), debe: 0, haber: 3500 },
    ]);
  numDirectos2025++;

  await crearComprobanteDirecto(gestion2025.id, empresaId, usuarioId, 'egreso',
    'Pago planilla marzo 2025', '2025-03-31', [
      { cuentaId: getCuenta('5.2.1'), debe: 14000, haber: 0 },
      { cuentaId: getCuenta('1.1.1.1'), debe: 0, haber: 14000 },
    ]);
  numDirectos2025++;

  await crearComprobanteDirecto(gestion2025.id, empresaId, usuarioId, 'egreso',
    'Pago servicios básicos marzo', '2025-03-31', [
      { cuentaId: getCuenta('5.2.3'), debe: 520, haber: 0 },
      { cuentaId: getCuenta('1.1.1.1'), debe: 0, haber: 520 },
    ]);
  numDirectos2025++;

  await crearComprobanteDirecto(gestion2025.id, empresaId, usuarioId, 'egreso',
    'Pago IVA período febrero 2025', '2025-03-20', [
      { cuentaId: getCuenta('2.1.3.1'), debe: 2210, haber: 0 },
      { cuentaId: getCuenta('1.1.2.1'), debe: 0, haber: 2210 },
    ]);
  numDirectos2025++;

  // --- ABRIL 2025 ---

  await crearYContabilizarCompra(gestion2025.id, empresaId, usuarioId, {
    fecha: '2025-04-02', nit: '3045678901', razonSocial: 'Importadora Footwear',
    numeroCompra: 'FAC-005', numeroDui: '0', importeTotal: 50000,
    importeNoSujeto: 0, descuentos: 0, tipo: 'interno',
    glosa: 'Compra temporada otoño-invierno - Importadora Footwear',
  }, [
    { cuentaId: getCuenta('1.1.5.1'), debe: 6500, haber: 0 },
    { cuentaId: getCuenta('1.1.3.1'), debe: 43500, haber: 0 },
    { cuentaId: getCuenta('2.1.1.1'), debe: 0, haber: 50000 },
  ]);
  numCompras2025++;

  await crearYContabilizarVenta(gestion2025.id, empresaId, usuarioId, {
    fecha: '2025-04-15', nit: '0', razonSocial: 'Ventas Contado',
    numeroVenta: '001-006', importeTotal: 15080,
    importeExento: 0, descuentos: 0, tipo: 'interno',
    glosa: 'Ventas contado abril',
  }, [
    { cuentaId: getCuenta('1.1.1.1'), debe: 15080, haber: 0 },
    { cuentaId: getCuenta('4.1.1.1'), debe: 0, haber: 13000, glosa: 'Ventas zap. caballero' },
    { cuentaId: getCuenta('2.1.3.1'), debe: 0, haber: 1690, glosa: 'Débito Fiscal IVA' },
    { cuentaId: getCuenta('2.1.3.2'), debe: 0, haber: 390, glosa: 'IT 3%' },
  ]);
  numVentas2025++;

  await crearYContabilizarVenta(gestion2025.id, empresaId, usuarioId, {
    fecha: '2025-04-30', nit: '0', razonSocial: 'Ventas Contado',
    numeroVenta: '001-007', importeTotal: 12760,
    importeExento: 0, descuentos: 0, tipo: 'interno',
    glosa: 'Ventas contado abril 2da quincena',
  }, [
    { cuentaId: getCuenta('1.1.1.1'), debe: 12760, haber: 0 },
    { cuentaId: getCuenta('4.1.1.2'), debe: 0, haber: 11000, glosa: 'Ventas zap. dama' },
    { cuentaId: getCuenta('2.1.3.1'), debe: 0, haber: 1430, glosa: 'Débito Fiscal IVA' },
    { cuentaId: getCuenta('2.1.3.2'), debe: 0, haber: 330, glosa: 'IT 3%' },
  ]);
  numVentas2025++;

  await crearComprobanteDirecto(gestion2025.id, empresaId, usuarioId, 'egreso',
    'Pago alquiler + planilla + servicios abril', '2025-04-30', [
      { cuentaId: getCuenta('5.2.2'), debe: 3500, haber: 0 },
      { cuentaId: getCuenta('5.2.1'), debe: 14000, haber: 0 },
      { cuentaId: getCuenta('5.2.3'), debe: 410, haber: 0 },
      { cuentaId: getCuenta('1.1.1.1'), debe: 0, haber: 17910 },
    ]);
  numDirectos2025++;

  await crearComprobanteDirecto(gestion2025.id, empresaId, usuarioId, 'egreso',
    'Pago IVA período marzo 2025', '2025-04-20', [
      { cuentaId: getCuenta('2.1.3.1'), debe: 2860, haber: 0 },
      { cuentaId: getCuenta('1.1.2.1'), debe: 0, haber: 2860 },
    ]);
  numDirectos2025++;

  await crearComprobanteDirecto(gestion2025.id, empresaId, usuarioId, 'egreso',
    'Pago parcial a Distribuidora Calzado Bolivia', '2025-04-15', [
      { cuentaId: getCuenta('2.1.1.1'), debe: 20000, haber: 0 },
      { cuentaId: getCuenta('1.1.2.1'), debe: 0, haber: 20000 },
    ]);
  numDirectos2025++;

  // --- MAYO 2025 ---

  await crearYContabilizarVenta(gestion2025.id, empresaId, usuarioId, {
    fecha: '2025-05-15', nit: '0', razonSocial: 'Ventas Contado',
    numeroVenta: '001-008', importeTotal: 13920,
    importeExento: 0, descuentos: 0, tipo: 'interno',
    glosa: 'Ventas mayo 1ra quincena',
  }, [
    { cuentaId: getCuenta('1.1.1.1'), debe: 13920, haber: 0 },
    { cuentaId: getCuenta('4.1.1.1'), debe: 0, haber: 12000 },
    { cuentaId: getCuenta('2.1.3.1'), debe: 0, haber: 1560 },
    { cuentaId: getCuenta('2.1.3.2'), debe: 0, haber: 360 },
  ]);
  numVentas2025++;

  await crearYContabilizarVenta(gestion2025.id, empresaId, usuarioId, {
    fecha: '2025-05-31', nit: '0', razonSocial: 'Ventas Contado',
    numeroVenta: '001-009', importeTotal: 11600,
    importeExento: 0, descuentos: 0, tipo: 'interno',
    glosa: 'Ventas mayo 2da quincena',
  }, [
    { cuentaId: getCuenta('1.1.1.1'), debe: 11600, haber: 0 },
    { cuentaId: getCuenta('4.1.1.2'), debe: 0, haber: 10000 },
    { cuentaId: getCuenta('2.1.3.1'), debe: 0, haber: 1300 },
    { cuentaId: getCuenta('2.1.3.2'), debe: 0, haber: 300 },
  ]);
  numVentas2025++;

  await crearYContabilizarCompra(gestion2025.id, empresaId, usuarioId, {
    fecha: '2025-05-05', nit: '1023456789', razonSocial: 'Distribuidora Calzado Bolivia',
    numeroCompra: 'FAC-006', numeroDui: '0', importeTotal: 30000,
    importeNoSujeto: 0, descuentos: 0, tipo: 'interno',
    glosa: 'Compra mercadería mayo',
  }, [
    { cuentaId: getCuenta('1.1.5.1'), debe: 3900, haber: 0 },
    { cuentaId: getCuenta('1.1.3.1'), debe: 26100, haber: 0 },
    { cuentaId: getCuenta('2.1.1.1'), debe: 0, haber: 30000 },
  ]);
  numCompras2025++;

  await crearComprobanteDirecto(gestion2025.id, empresaId, usuarioId, 'egreso',
    'Gastos operativos mayo (alquiler + planilla + servicios)', '2025-05-31', [
      { cuentaId: getCuenta('5.2.2'), debe: 3500, haber: 0 },
      { cuentaId: getCuenta('5.2.1'), debe: 14000, haber: 0 },
      { cuentaId: getCuenta('5.2.3'), debe: 480, haber: 0 },
      { cuentaId: getCuenta('1.1.1.1'), debe: 0, haber: 17980 },
    ]);
  numDirectos2025++;

  await crearComprobanteDirecto(gestion2025.id, empresaId, usuarioId, 'egreso',
    'Pago IVA período abril 2025', '2025-05-20', [
      { cuentaId: getCuenta('2.1.3.1'), debe: 3120, haber: 0 },
      { cuentaId: getCuenta('1.1.2.1'), debe: 0, haber: 3120 },
    ]);
  numDirectos2025++;

  // --- JUNIO 2025 ---

  await crearYContabilizarVenta(gestion2025.id, empresaId, usuarioId, {
    fecha: '2025-06-15', nit: '0', razonSocial: 'Ventas Contado',
    numeroVenta: '001-010', importeTotal: 16240,
    importeExento: 0, descuentos: 0, tipo: 'interno',
    glosa: 'Ventas junio 1ra quincena',
  }, [
    { cuentaId: getCuenta('1.1.1.1'), debe: 16240, haber: 0 },
    { cuentaId: getCuenta('4.1.1.1'), debe: 0, haber: 14000 },
    { cuentaId: getCuenta('2.1.3.1'), debe: 0, haber: 1820 },
    { cuentaId: getCuenta('2.1.3.2'), debe: 0, haber: 420 },
  ]);
  numVentas2025++;

  await crearYContabilizarVenta(gestion2025.id, empresaId, usuarioId, {
    fecha: '2025-06-30', nit: '0', razonSocial: 'Ventas Contado',
    numeroVenta: '001-011', importeTotal: 15080,
    importeExento: 0, descuentos: 0, tipo: 'interno',
    glosa: 'Ventas junio 2da quincena',
  }, [
    { cuentaId: getCuenta('1.1.1.1'), debe: 15080, haber: 0 },
    { cuentaId: getCuenta('4.1.1.2'), debe: 0, haber: 13000 },
    { cuentaId: getCuenta('2.1.3.1'), debe: 0, haber: 1690 },
    { cuentaId: getCuenta('2.1.3.2'), debe: 0, haber: 390 },
  ]);
  numVentas2025++;

  await crearYContabilizarCompra(gestion2025.id, empresaId, usuarioId, {
    fecha: '2025-06-03', nit: '3045678901', razonSocial: 'Importadora Footwear',
    numeroCompra: 'FAC-007', numeroDui: '0', importeTotal: 35000,
    importeNoSujeto: 0, descuentos: 0, tipo: 'interno',
    glosa: 'Compra mercadería junio',
  }, [
    { cuentaId: getCuenta('1.1.5.1'), debe: 4550, haber: 0 },
    { cuentaId: getCuenta('1.1.3.1'), debe: 30450, haber: 0 },
    { cuentaId: getCuenta('2.1.1.1'), debe: 0, haber: 35000 },
  ]);
  numCompras2025++;

  await crearComprobanteDirecto(gestion2025.id, empresaId, usuarioId, 'egreso',
    'Gastos operativos junio', '2025-06-30', [
      { cuentaId: getCuenta('5.2.2'), debe: 3500, haber: 0 },
      { cuentaId: getCuenta('5.2.1'), debe: 14000, haber: 0 },
      { cuentaId: getCuenta('5.2.3'), debe: 390, haber: 0 },
      { cuentaId: getCuenta('1.1.1.1'), debe: 0, haber: 17890 },
    ]);
  numDirectos2025++;

  await crearComprobanteDirecto(gestion2025.id, empresaId, usuarioId, 'egreso',
    'Pago IVA período mayo 2025', '2025-06-20', [
      { cuentaId: getCuenta('2.1.3.1'), debe: 2860, haber: 0 },
      { cuentaId: getCuenta('1.1.2.1'), debe: 0, haber: 2860 },
    ]);
  numDirectos2025++;

  // --- JULIO 2025 ---

  await crearYContabilizarVenta(gestion2025.id, empresaId, usuarioId, {
    fecha: '2025-07-10', nit: '4056789012', razonSocial: 'Colegio San Andrés',
    numeroVenta: '001-012', importeTotal: 23200,
    importeExento: 0, descuentos: 0, tipo: 'interno',
    glosa: 'Venta a crédito - Colegio San Andrés (uniforme calzado)',
  }, [
    { cuentaId: getCuenta('1.1.4.1'), debe: 23200, haber: 0, glosa: 'Cuenta por cobrar Colegio San Andrés' },
    { cuentaId: getCuenta('4.1.1.1'), debe: 0, haber: 20000, glosa: 'Venta calzado infantil' },
    { cuentaId: getCuenta('2.1.3.1'), debe: 0, haber: 2600, glosa: 'Débito Fiscal IVA' },
    { cuentaId: getCuenta('2.1.3.2'), debe: 0, haber: 600, glosa: 'IT 3%' },
  ]);
  numVentas2025++;

  await crearComprobanteDirecto(gestion2025.id, empresaId, usuarioId, 'ingreso',
    'Cobro parcial Colegio San Andrés', '2025-07-25', [
      { cuentaId: getCuenta('1.1.2.1'), debe: 15000, haber: 0 },
      { cuentaId: getCuenta('1.1.4.1'), debe: 0, haber: 15000 },
    ]);
  numDirectos2025++;

  await crearYContabilizarVenta(gestion2025.id, empresaId, usuarioId, {
    fecha: '2025-07-31', nit: '0', razonSocial: 'Ventas Contado',
    numeroVenta: '001-013', importeTotal: 17400,
    importeExento: 0, descuentos: 0, tipo: 'interno',
    glosa: 'Ventas contado julio',
  }, [
    { cuentaId: getCuenta('1.1.1.1'), debe: 17400, haber: 0 },
    { cuentaId: getCuenta('4.1.1.1'), debe: 0, haber: 15000 },
    { cuentaId: getCuenta('2.1.3.1'), debe: 0, haber: 1950 },
    { cuentaId: getCuenta('2.1.3.2'), debe: 0, haber: 450 },
  ]);
  numVentas2025++;

  await crearYContabilizarCompra(gestion2025.id, empresaId, usuarioId, {
    fecha: '2025-07-31', nit: '1023456789', razonSocial: 'Distribuidora Calzado Bolivia',
    numeroCompra: 'FAC-008', numeroDui: '0', importeTotal: 25000,
    importeNoSujeto: 0, descuentos: 0, tipo: 'interno',
    glosa: 'Compra mercadería julio',
  }, [
    { cuentaId: getCuenta('1.1.5.1'), debe: 3250, haber: 0 },
    { cuentaId: getCuenta('1.1.3.1'), debe: 21750, haber: 0 },
    { cuentaId: getCuenta('2.1.1.1'), debe: 0, haber: 25000 },
  ]);
  numCompras2025++;

  await crearComprobanteDirecto(gestion2025.id, empresaId, usuarioId, 'egreso',
    'Gastos operativos julio (alquiler + planilla + servicios)', '2025-07-31', [
      { cuentaId: getCuenta('5.2.2'), debe: 3500, haber: 0 },
      { cuentaId: getCuenta('5.2.1'), debe: 14000, haber: 0 },
      { cuentaId: getCuenta('5.2.3'), debe: 440, haber: 0 },
      { cuentaId: getCuenta('1.1.1.1'), debe: 0, haber: 17940 },
    ]);
  numDirectos2025++;

  // --- AGOSTO 2025 ---

  await crearYContabilizarVenta(gestion2025.id, empresaId, usuarioId, {
    fecha: '2025-08-15', nit: '0', razonSocial: 'Ventas Contado',
    numeroVenta: '001-014', importeTotal: 18560,
    importeExento: 0, descuentos: 0, tipo: 'interno',
    glosa: 'Ventas agosto 1ra quincena',
  }, [
    { cuentaId: getCuenta('1.1.1.1'), debe: 18560, haber: 0 },
    { cuentaId: getCuenta('4.1.1.1'), debe: 0, haber: 16000 },
    { cuentaId: getCuenta('2.1.3.1'), debe: 0, haber: 2080 },
    { cuentaId: getCuenta('2.1.3.2'), debe: 0, haber: 480 },
  ]);
  numVentas2025++;

  await crearYContabilizarVenta(gestion2025.id, empresaId, usuarioId, {
    fecha: '2025-08-31', nit: '0', razonSocial: 'Ventas Contado',
    numeroVenta: '001-015', importeTotal: 16240,
    importeExento: 0, descuentos: 0, tipo: 'interno',
    glosa: 'Ventas agosto 2da quincena',
  }, [
    { cuentaId: getCuenta('1.1.1.1'), debe: 16240, haber: 0 },
    { cuentaId: getCuenta('4.1.1.2'), debe: 0, haber: 14000 },
    { cuentaId: getCuenta('2.1.3.1'), debe: 0, haber: 1820 },
    { cuentaId: getCuenta('2.1.3.2'), debe: 0, haber: 420 },
  ]);
  numVentas2025++;

  await crearYContabilizarCompra(gestion2025.id, empresaId, usuarioId, {
    fecha: '2025-08-04', nit: '3045678901', razonSocial: 'Importadora Footwear',
    numeroCompra: 'FAC-009', numeroDui: '0', importeTotal: 45000,
    importeNoSujeto: 0, descuentos: 0, tipo: 'interno',
    glosa: 'Compra mercadería agosto',
  }, [
    { cuentaId: getCuenta('1.1.5.1'), debe: 5850, haber: 0 },
    { cuentaId: getCuenta('1.1.3.1'), debe: 39150, haber: 0 },
    { cuentaId: getCuenta('2.1.1.1'), debe: 0, haber: 45000 },
  ]);
  numCompras2025++;

  await crearComprobanteDirecto(gestion2025.id, empresaId, usuarioId, 'egreso',
    'Gastos operativos agosto', '2025-08-31', [
      { cuentaId: getCuenta('5.2.2'), debe: 3500, haber: 0 },
      { cuentaId: getCuenta('5.2.1'), debe: 14000, haber: 0 },
      { cuentaId: getCuenta('5.2.3'), debe: 510, haber: 0 },
      { cuentaId: getCuenta('1.1.1.1'), debe: 0, haber: 18010 },
    ]);
  numDirectos2025++;

  await crearComprobanteDirecto(gestion2025.id, empresaId, usuarioId, 'egreso',
    'Pago IVA período julio 2025', '2025-08-20', [
      { cuentaId: getCuenta('2.1.3.1'), debe: 5850, haber: 0 },
      { cuentaId: getCuenta('1.1.2.1'), debe: 0, haber: 5850 },
    ]);
  numDirectos2025++;

  // --- SEPTIEMBRE 2025 ---

  await crearYContabilizarVenta(gestion2025.id, empresaId, usuarioId, {
    fecha: '2025-09-15', nit: '0', razonSocial: 'Ventas Contado',
    numeroVenta: '001-016', importeTotal: 19720,
    importeExento: 0, descuentos: 0, tipo: 'interno',
    glosa: 'Ventas septiembre 1ra quincena',
  }, [
    { cuentaId: getCuenta('1.1.1.1'), debe: 19720, haber: 0 },
    { cuentaId: getCuenta('4.1.1.1'), debe: 0, haber: 17000 },
    { cuentaId: getCuenta('2.1.3.1'), debe: 0, haber: 2210 },
    { cuentaId: getCuenta('2.1.3.2'), debe: 0, haber: 510 },
  ]);
  numVentas2025++;

  await crearYContabilizarVenta(gestion2025.id, empresaId, usuarioId, {
    fecha: '2025-09-30', nit: '0', razonSocial: 'Ventas Contado',
    numeroVenta: '001-017', importeTotal: 17400,
    importeExento: 0, descuentos: 0, tipo: 'interno',
    glosa: 'Ventas septiembre 2da quincena',
  }, [
    { cuentaId: getCuenta('1.1.1.1'), debe: 17400, haber: 0 },
    { cuentaId: getCuenta('4.1.1.2'), debe: 0, haber: 15000 },
    { cuentaId: getCuenta('2.1.3.1'), debe: 0, haber: 1950 },
    { cuentaId: getCuenta('2.1.3.2'), debe: 0, haber: 450 },
  ]);
  numVentas2025++;

  await crearYContabilizarCompra(gestion2025.id, empresaId, usuarioId, {
    fecha: '2025-09-02', nit: '3045678901', razonSocial: 'Importadora Footwear',
    numeroCompra: 'FAC-010', numeroDui: '0', importeTotal: 55000,
    importeNoSujeto: 0, descuentos: 0, tipo: 'interno',
    glosa: 'Compra temporada primavera - Importadora Footwear',
  }, [
    { cuentaId: getCuenta('1.1.5.1'), debe: 7150, haber: 0 },
    { cuentaId: getCuenta('1.1.3.1'), debe: 47850, haber: 0 },
    { cuentaId: getCuenta('2.1.1.1'), debe: 0, haber: 55000 },
  ]);
  numCompras2025++;

  await crearComprobanteDirecto(gestion2025.id, empresaId, usuarioId, 'egreso',
    'Gastos operativos septiembre', '2025-09-30', [
      { cuentaId: getCuenta('5.2.2'), debe: 3500, haber: 0 },
      { cuentaId: getCuenta('5.2.1'), debe: 14000, haber: 0 },
      { cuentaId: getCuenta('5.2.3'), debe: 430, haber: 0 },
      { cuentaId: getCuenta('1.1.1.1'), debe: 0, haber: 17930 },
    ]);
  numDirectos2025++;

  // --- OCTUBRE 2025 ---

  await crearYContabilizarVenta(gestion2025.id, empresaId, usuarioId, {
    fecha: '2025-10-15', nit: '0', razonSocial: 'Ventas Contado',
    numeroVenta: '001-018', importeTotal: 20880,
    importeExento: 0, descuentos: 0, tipo: 'interno',
    glosa: 'Ventas octubre 1ra quincena',
  }, [
    { cuentaId: getCuenta('1.1.1.1'), debe: 20880, haber: 0 },
    { cuentaId: getCuenta('4.1.1.1'), debe: 0, haber: 18000 },
    { cuentaId: getCuenta('2.1.3.1'), debe: 0, haber: 2340 },
    { cuentaId: getCuenta('2.1.3.2'), debe: 0, haber: 540 },
  ]);
  numVentas2025++;

  await crearYContabilizarVenta(gestion2025.id, empresaId, usuarioId, {
    fecha: '2025-10-31', nit: '0', razonSocial: 'Ventas Contado',
    numeroVenta: '001-019', importeTotal: 18560,
    importeExento: 0, descuentos: 0, tipo: 'interno',
    glosa: 'Ventas octubre 2da quincena',
  }, [
    { cuentaId: getCuenta('1.1.1.1'), debe: 18560, haber: 0 },
    { cuentaId: getCuenta('4.1.1.2'), debe: 0, haber: 16000 },
    { cuentaId: getCuenta('2.1.3.1'), debe: 0, haber: 2080 },
    { cuentaId: getCuenta('2.1.3.2'), debe: 0, haber: 480 },
  ]);
  numVentas2025++;

  await crearYContabilizarCompra(gestion2025.id, empresaId, usuarioId, {
    fecha: '2025-10-03', nit: '1023456789', razonSocial: 'Distribuidora Calzado Bolivia',
    numeroCompra: 'FAC-011', numeroDui: '0', importeTotal: 40000,
    importeNoSujeto: 0, descuentos: 0, tipo: 'interno',
    glosa: 'Compra mercadería octubre',
  }, [
    { cuentaId: getCuenta('1.1.5.1'), debe: 5200, haber: 0 },
    { cuentaId: getCuenta('1.1.3.1'), debe: 34800, haber: 0 },
    { cuentaId: getCuenta('2.1.1.1'), debe: 0, haber: 40000 },
  ]);
  numCompras2025++;

  await crearComprobanteDirecto(gestion2025.id, empresaId, usuarioId, 'egreso',
    'Gastos operativos octubre', '2025-10-31', [
      { cuentaId: getCuenta('5.2.2'), debe: 3500, haber: 0 },
      { cuentaId: getCuenta('5.2.1'), debe: 14000, haber: 0 },
      { cuentaId: getCuenta('5.2.3'), debe: 470, haber: 0 },
      { cuentaId: getCuenta('1.1.1.1'), debe: 0, haber: 17970 },
    ]);
  numDirectos2025++;

  // --- NOVIEMBRE 2025 ---

  await crearYContabilizarVenta(gestion2025.id, empresaId, usuarioId, {
    fecha: '2025-11-15', nit: '0', razonSocial: 'Ventas Contado',
    numeroVenta: '001-020', importeTotal: 22040,
    importeExento: 0, descuentos: 0, tipo: 'interno',
    glosa: 'Ventas noviembre 1ra quincena',
  }, [
    { cuentaId: getCuenta('1.1.1.1'), debe: 22040, haber: 0 },
    { cuentaId: getCuenta('4.1.1.1'), debe: 0, haber: 19000 },
    { cuentaId: getCuenta('2.1.3.1'), debe: 0, haber: 2470 },
    { cuentaId: getCuenta('2.1.3.2'), debe: 0, haber: 570 },
  ]);
  numVentas2025++;

  await crearYContabilizarVenta(gestion2025.id, empresaId, usuarioId, {
    fecha: '2025-11-30', nit: '0', razonSocial: 'Ventas Contado',
    numeroVenta: '001-021', importeTotal: 19720,
    importeExento: 0, descuentos: 0, tipo: 'interno',
    glosa: 'Ventas noviembre 2da quincena',
  }, [
    { cuentaId: getCuenta('1.1.1.1'), debe: 19720, haber: 0 },
    { cuentaId: getCuenta('4.1.1.2'), debe: 0, haber: 17000 },
    { cuentaId: getCuenta('2.1.3.1'), debe: 0, haber: 2210 },
    { cuentaId: getCuenta('2.1.3.2'), debe: 0, haber: 510 },
  ]);
  numVentas2025++;

  await crearYContabilizarCompra(gestion2025.id, empresaId, usuarioId, {
    fecha: '2025-11-05', nit: '1023456789', razonSocial: 'Distribuidora Calzado Bolivia',
    numeroCompra: 'FAC-012', numeroDui: '0', importeTotal: 60000,
    importeNoSujeto: 0, descuentos: 0, tipo: 'interno',
    glosa: 'Compra navideña - Distribuidora Calzado Bolivia',
  }, [
    { cuentaId: getCuenta('1.1.5.1'), debe: 7800, haber: 0 },
    { cuentaId: getCuenta('1.1.3.1'), debe: 52200, haber: 0 },
    { cuentaId: getCuenta('2.1.1.1'), debe: 0, haber: 60000 },
  ]);
  numCompras2025++;

  await crearComprobanteDirecto(gestion2025.id, empresaId, usuarioId, 'egreso',
    'Publicidad y propaganda noviembre', '2025-11-10', [
      { cuentaId: getCuenta('5.2.5'), debe: 2000, haber: 0, glosa: 'Publicidad radial y redes sociales' },
      { cuentaId: getCuenta('1.1.1.1'), debe: 0, haber: 2000 },
    ]);
  numDirectos2025++;

  await crearComprobanteDirecto(gestion2025.id, empresaId, usuarioId, 'egreso',
    'Gastos operativos noviembre', '2025-11-30', [
      { cuentaId: getCuenta('5.2.2'), debe: 3500, haber: 0 },
      { cuentaId: getCuenta('5.2.1'), debe: 14000, haber: 0 },
      { cuentaId: getCuenta('5.2.3'), debe: 500, haber: 0 },
      { cuentaId: getCuenta('1.1.1.1'), debe: 0, haber: 18000 },
    ]);
  numDirectos2025++;

  // --- DICIEMBRE 2025 ---

  await crearYContabilizarVenta(gestion2025.id, empresaId, usuarioId, {
    fecha: '2025-12-15', nit: '0', razonSocial: 'Ventas Contado',
    numeroVenta: '001-022', importeTotal: 27840,
    importeExento: 0, descuentos: 0, tipo: 'interno',
    glosa: 'Ventas diciembre 1ra quincena (temporada navideña)',
  }, [
    { cuentaId: getCuenta('1.1.1.1'), debe: 27840, haber: 0 },
    { cuentaId: getCuenta('4.1.1.1'), debe: 0, haber: 24000 },
    { cuentaId: getCuenta('2.1.3.1'), debe: 0, haber: 3120 },
    { cuentaId: getCuenta('2.1.3.2'), debe: 0, haber: 720 },
  ]);
  numVentas2025++;

  await crearYContabilizarVenta(gestion2025.id, empresaId, usuarioId, {
    fecha: '2025-12-31', nit: '0', razonSocial: 'Ventas Contado',
    numeroVenta: '001-023', importeTotal: 34800,
    importeExento: 0, descuentos: 0, tipo: 'interno',
    glosa: 'Ventas diciembre 2da quincena (récord navideño)',
  }, [
    { cuentaId: getCuenta('1.1.1.1'), debe: 34800, haber: 0 },
    { cuentaId: getCuenta('4.1.1.1'), debe: 0, haber: 30000 },
    { cuentaId: getCuenta('2.1.3.1'), debe: 0, haber: 3900 },
    { cuentaId: getCuenta('2.1.3.2'), debe: 0, haber: 900 },
  ]);
  numVentas2025++;

  await crearComprobanteDirecto(gestion2025.id, empresaId, usuarioId, 'egreso',
    'Gastos operativos diciembre', '2025-12-31', [
      { cuentaId: getCuenta('5.2.2'), debe: 3500, haber: 0 },
      { cuentaId: getCuenta('5.2.1'), debe: 14000, haber: 0 },
      { cuentaId: getCuenta('5.2.3'), debe: 550, haber: 0 },
      { cuentaId: getCuenta('1.1.1.1'), debe: 0, haber: 18050 },
    ]);
  numDirectos2025++;

  await crearComprobanteDirecto(gestion2025.id, empresaId, usuarioId, 'egreso',
    'Pago aguinaldo de fin de gestión 2025', '2025-12-20', [
      { cuentaId: getCuenta('5.2.1'), debe: 14000, haber: 0, glosa: 'Aguinaldo (1 mes de sueldos)' },
      { cuentaId: getCuenta('1.1.1.1'), debe: 0, haber: 14000 },
    ]);
  numDirectos2025++;

  await crearComprobanteDirecto(gestion2025.id, empresaId, usuarioId, 'traspaso',
    'Registro depreciación anual mobiliario (10%)', '2025-12-31', [
      { cuentaId: getCuenta('5.2.4'), debe: 1740, haber: 0, glosa: 'Depreciación mobiliario' },
      { cuentaId: getCuenta('1.2.5.1'), debe: 0, haber: 1740, glosa: 'Dep. acum. mobiliario' },
    ]);
  numDirectos2025++;

  // CIERRE DE GESTIÓN 2025
  const ingresos2025 = await ComprobanteDetalle.findAll({
    include: [
      { model: PlanCuenta, where: { tipo: 'Ingreso' } },
      { model: Comprobante, where: { gestionId: gestion2025.id, estado: 'activo' } },
    ],
  });
  const gastos2025 = await ComprobanteDetalle.findAll({
    include: [
      { model: PlanCuenta, where: { tipo: 'Gasto' } },
      { model: Comprobante, where: { gestionId: gestion2025.id, estado: 'activo' } },
    ],
  });

  let totalIngresos = 0;
  ingresos2025.forEach((d) => { totalIngresos += parseFloat(d.haber) || 0; });

  let totalGastos = 0;
  gastos2025.forEach((d) => { totalGastos += parseFloat(d.debe) || 0; });

  const utilidad2025 = bs(totalIngresos - totalGastos);

  await crearComprobanteDirecto(gestion2025.id, empresaId, usuarioId, 'traspaso',
    'Cierre de cuentas de ingreso - Gestión 2025', '2025-12-31', [
      { cuentaId: getCuenta('4.1.1.1'), debe: bs(totalIngresos * 0.55), haber: 0, glosa: 'Cierre ventas caballero' },
      { cuentaId: getCuenta('4.1.1.2'), debe: bs(totalIngresos * 0.45), haber: 0, glosa: 'Cierre ventas dama' },
      { cuentaId: getCuenta('3.3'), debe: 0, haber: totalIngresos, glosa: 'Traslado a resultado del ejercicio' },
    ]);
  numDirectos2025++;

  await crearComprobanteDirecto(gestion2025.id, empresaId, usuarioId, 'traspaso',
    'Cierre de cuentas de gasto - Gestión 2025', '2025-12-31', [
      { cuentaId: getCuenta('3.3'), debe: totalGastos, haber: 0, glosa: 'Traslado de gastos al resultado' },
      { cuentaId: getCuenta('5.2.1'), debe: 0, haber: bs(totalGastos * 0.65), glosa: 'Cierre sueldos' },
      { cuentaId: getCuenta('5.2.2'), debe: 0, haber: bs(totalGastos * 0.12), glosa: 'Cierre alquiler' },
      { cuentaId: getCuenta('5.2.3'), debe: 0, haber: bs(totalGastos * 0.02), glosa: 'Cierre servicios' },
      { cuentaId: getCuenta('5.2.4'), debe: 0, haber: bs(totalGastos * 0.01), glosa: 'Cierre depreciación' },
      { cuentaId: getCuenta('5.2.5'), debe: 0, haber: bs(totalGastos * 0.20), glosa: 'Cierre otros gastos' },
    ]);
  numDirectos2025++;

  console.log(`  2025: ${numCompras2025} compras, ${numVentas2025} ventas, ${numDirectos2025} comprobantes directos. Utilidad: Bs. ${utilidad2025.toFixed(2)}`);

  // =========================================================================
  // GESTIÓN 2026
  // =========================================================================
  console.log('Sembrando Gestión 2026...');

  // Pago IUE 2025 (directo)
  await crearComprobanteDirecto(gestion2026.id, empresaId, usuarioId, 'egreso',
    'Pago IUE gestión 2025 (25% de utilidad)', '2026-01-15', [
      { cuentaId: getCuenta('3.3'), debe: bs(utilidad2025 * 0.25), haber: 0, glosa: 'IUE 25%' },
      { cuentaId: getCuenta('1.1.2.1'), debe: 0, haber: bs(utilidad2025 * 0.25), glosa: 'Pago IUE banco' },
    ]);
  numDirectos2026++;

  // Compra enero → Compra
  await crearYContabilizarCompra(gestion2026.id, empresaId, usuarioId, {
    fecha: '2026-01-06', nit: '1023456789', razonSocial: 'Distribuidora Calzado Bolivia',
    numeroCompra: 'FAC-101', numeroDui: '0', importeTotal: 40000,
    importeNoSujeto: 0, descuentos: 0, tipo: 'interno',
    glosa: 'Compra mercadería enero 2026',
  });
  numCompras2026++;

  // Ventas enero → Venta
  await crearYContabilizarVenta(gestion2026.id, empresaId, usuarioId, {
    fecha: '2026-01-31', nit: '0', razonSocial: 'Ventas Contado',
    numeroVenta: '002-001', importeTotal: 24360,
    importeExento: 0, descuentos: 0, tipo: 'interno',
    glosa: 'Ventas enero 2026',
  }, [
    { cuentaId: getCuenta('1.1.1.1'), debe: 24360, haber: 0 },
    { cuentaId: getCuenta('4.1.1.1'), debe: 0, haber: 21000 },
    { cuentaId: getCuenta('2.1.3.1'), debe: 0, haber: 2730 },
    { cuentaId: getCuenta('2.1.3.2'), debe: 0, haber: 630 },
  ]);
  numVentas2026++;

  // Gastos enero (directo)
  await crearComprobanteDirecto(gestion2026.id, empresaId, usuarioId, 'egreso',
    'Gastos operativos enero 2026', '2026-01-31', [
      { cuentaId: getCuenta('5.2.2'), debe: 3500, haber: 0 },
      { cuentaId: getCuenta('5.2.1'), debe: 14000, haber: 0 },
      { cuentaId: getCuenta('5.2.3'), debe: 480, haber: 0 },
      { cuentaId: getCuenta('1.1.1.1'), debe: 0, haber: 17980 },
    ]);
  numDirectos2026++;

  // Compra febrero → Compra
  await crearYContabilizarCompra(gestion2026.id, empresaId, usuarioId, {
    fecha: '2026-02-04', nit: '3045678901', razonSocial: 'Importadora Footwear',
    numeroCompra: 'FAC-102', numeroDui: '0', importeTotal: 35000,
    importeNoSujeto: 0, descuentos: 0, tipo: 'interno',
    glosa: 'Compra mercadería febrero 2026',
  });
  numCompras2026++;

  // Ventas febrero → Venta
  await crearYContabilizarVenta(gestion2026.id, empresaId, usuarioId, {
    fecha: '2026-02-28', nit: '0', razonSocial: 'Ventas Contado',
    numeroVenta: '002-002', importeTotal: 20880,
    importeExento: 0, descuentos: 0, tipo: 'interno',
    glosa: 'Ventas febrero 2026',
  }, [
    { cuentaId: getCuenta('1.1.1.1'), debe: 20880, haber: 0 },
    { cuentaId: getCuenta('4.1.1.2'), debe: 0, haber: 18000 },
    { cuentaId: getCuenta('2.1.3.1'), debe: 0, haber: 2340 },
    { cuentaId: getCuenta('2.1.3.2'), debe: 0, haber: 540 },
  ]);
  numVentas2026++;

  // Gastos febrero (directo)
  await crearComprobanteDirecto(gestion2026.id, empresaId, usuarioId, 'egreso',
    'Gastos operativos febrero 2026', '2026-02-28', [
      { cuentaId: getCuenta('5.2.2'), debe: 3500, haber: 0 },
      { cuentaId: getCuenta('5.2.1'), debe: 14000, haber: 0 },
      { cuentaId: getCuenta('5.2.3'), debe: 420, haber: 0 },
      { cuentaId: getCuenta('1.1.1.1'), debe: 0, haber: 17920 },
    ]);
  numDirectos2026++;

  // Compra vehículo → Compra
  await crearYContabilizarCompra(gestion2026.id, empresaId, usuarioId, {
    fecha: '2026-03-10', nit: '5067890123', razonSocial: 'Chevrolet Bolivia SA',
    numeroCompra: 'FAC-103', numeroDui: '0', importeTotal: 80000,
    importeNoSujeto: 0, descuentos: 0, tipo: 'interno',
    glosa: 'Compra vehículo de delivery - Chevrolet NHR',
  }, [
    { cuentaId: getCuenta('1.1.5.1'), debe: 10400, haber: 0, glosa: 'Crédito Fiscal IVA' },
    { cuentaId: getCuenta('1.2.2'), debe: 69600, haber: 0, glosa: 'Vehículo Chevrolet NHR' },
    { cuentaId: getCuenta('2.1.1.1'), debe: 0, haber: 80000, glosa: 'Pago con banco' },
  ]);
  numCompras2026++;

  // Compra mercadería marzo → Compra
  await crearYContabilizarCompra(gestion2026.id, empresaId, usuarioId, {
    fecha: '2026-03-03', nit: '1023456789', razonSocial: 'Distribuidora Calzado Bolivia',
    numeroCompra: 'FAC-104', numeroDui: '0', importeTotal: 45000,
    importeNoSujeto: 0, descuentos: 0, tipo: 'interno',
    glosa: 'Compra mercadería marzo 2026',
  });
  numCompras2026++;

  // Ventas marzo → Venta
  await crearYContabilizarVenta(gestion2026.id, empresaId, usuarioId, {
    fecha: '2026-03-31', nit: '0', razonSocial: 'Ventas Contado',
    numeroVenta: '002-003', importeTotal: 25520,
    importeExento: 0, descuentos: 0, tipo: 'interno',
    glosa: 'Ventas marzo 2026',
  }, [
    { cuentaId: getCuenta('1.1.1.1'), debe: 25520, haber: 0 },
    { cuentaId: getCuenta('4.1.1.1'), debe: 0, haber: 22000 },
    { cuentaId: getCuenta('2.1.3.1'), debe: 0, haber: 2860 },
    { cuentaId: getCuenta('2.1.3.2'), debe: 0, haber: 660 },
  ]);
  numVentas2026++;

  // Gastos marzo (directo)
  await crearComprobanteDirecto(gestion2026.id, empresaId, usuarioId, 'egreso',
    'Gastos operativos marzo 2026', '2026-03-31', [
      { cuentaId: getCuenta('5.2.2'), debe: 3500, haber: 0 },
      { cuentaId: getCuenta('5.2.1'), debe: 14000, haber: 0 },
      { cuentaId: getCuenta('5.2.3'), debe: 530, haber: 0 },
      { cuentaId: getCuenta('1.1.1.1'), debe: 0, haber: 18030 },
    ]);
  numDirectos2026++;

  // Compra abril → Compra
  await crearYContabilizarCompra(gestion2026.id, empresaId, usuarioId, {
    fecha: '2026-04-02', nit: '3045678901', razonSocial: 'Importadora Footwear',
    numeroCompra: 'FAC-105', numeroDui: '0', importeTotal: 50000,
    importeNoSujeto: 0, descuentos: 0, tipo: 'interno',
    glosa: 'Compra mercadería abril 2026',
  });
  numCompras2026++;

  // Ventas abril → Venta
  await crearYContabilizarVenta(gestion2026.id, empresaId, usuarioId, {
    fecha: '2026-04-30', nit: '0', razonSocial: 'Ventas Contado',
    numeroVenta: '002-004', importeTotal: 23200,
    importeExento: 0, descuentos: 0, tipo: 'interno',
    glosa: 'Ventas abril 2026',
  }, [
    { cuentaId: getCuenta('1.1.1.1'), debe: 23200, haber: 0 },
    { cuentaId: getCuenta('4.1.1.2'), debe: 0, haber: 20000 },
    { cuentaId: getCuenta('2.1.3.1'), debe: 0, haber: 2600 },
    { cuentaId: getCuenta('2.1.3.2'), debe: 0, haber: 600 },
  ]);
  numVentas2026++;

  // Gastos abril (directo)
  await crearComprobanteDirecto(gestion2026.id, empresaId, usuarioId, 'egreso',
    'Gastos operativos abril 2026', '2026-04-30', [
      { cuentaId: getCuenta('5.2.2'), debe: 3500, haber: 0 },
      { cuentaId: getCuenta('5.2.1'), debe: 14000, haber: 0 },
      { cuentaId: getCuenta('5.2.3'), debe: 460, haber: 0 },
      { cuentaId: getCuenta('1.1.1.1'), debe: 0, haber: 17960 },
    ]);
  numDirectos2026++;

  // Compra mayo → Compra
  await crearYContabilizarCompra(gestion2026.id, empresaId, usuarioId, {
    fecha: '2026-05-05', nit: '1023456789', razonSocial: 'Distribuidora Calzado Bolivia',
    numeroCompra: 'FAC-106', numeroDui: '0', importeTotal: 40000,
    importeNoSujeto: 0, descuentos: 0, tipo: 'interno',
    glosa: 'Compra mercadería mayo 2026',
  });
  numCompras2026++;

  // Ventas mayo → Venta
  await crearYContabilizarVenta(gestion2026.id, empresaId, usuarioId, {
    fecha: '2026-05-31', nit: '0', razonSocial: 'Ventas Contado',
    numeroVenta: '002-005', importeTotal: 26680,
    importeExento: 0, descuentos: 0, tipo: 'interno',
    glosa: 'Ventas mayo 2026',
  }, [
    { cuentaId: getCuenta('1.1.1.1'), debe: 26680, haber: 0 },
    { cuentaId: getCuenta('4.1.1.1'), debe: 0, haber: 23000 },
    { cuentaId: getCuenta('2.1.3.1'), debe: 0, haber: 2990 },
    { cuentaId: getCuenta('2.1.3.2'), debe: 0, haber: 690 },
  ]);
  numVentas2026++;

  // Gastos mayo (directo)
  await crearComprobanteDirecto(gestion2026.id, empresaId, usuarioId, 'egreso',
    'Gastos operativos mayo 2026', '2026-05-31', [
      { cuentaId: getCuenta('5.2.2'), debe: 3500, haber: 0 },
      { cuentaId: getCuenta('5.2.1'), debe: 14000, haber: 0 },
      { cuentaId: getCuenta('5.2.3'), debe: 500, haber: 0 },
      { cuentaId: getCuenta('1.1.1.1'), debe: 0, haber: 18000 },
    ]);
  numDirectos2026++;

  console.log(`  2026: ${numCompras2026} compras, ${numVentas2026} ventas, ${numDirectos2026} comprobantes directos`);

  console.log('\n=== Seed Zapatería Elegante SRL completado ===\n');
}

module.exports = seedZapateria;
