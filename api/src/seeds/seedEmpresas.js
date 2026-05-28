const { Empresa, Gestion, PlanCuenta, ClienteProveedor, Producto, Usuario } = require('../models');

async function seedEmpresas() {
  console.log('Ejecutando seed de empresas...');

  // Empresa 1: CENTRO DE DISTRIBUCIÓN ORURO
  const [oro] = await Empresa.findOrCreate({
    where: { nit: '4012345678' },
    defaults: {
      nombre: 'CENTRO DE DISTRIBUCIÓN ORURO',
      nit: '4012345678',
      direccion: 'Calle Bolívar #456, Oruro, Bolivia',
      telefono: '+591 25254321',
      metodoEvaluacion: 'CPP',
    },
  });

  const [oroGestion] = await Gestion.findOrCreate({
    where: { year: 2026, empresaId: oro.id },
    defaults: {
      year: 2026,
      glosa: 'Gestión Fiscal 2026',
      fechaInicio: '2026-01-01',
      fechaFin: '2026-12-31',
      actividad: 'Comercial - Distribución de Bebidas',
      empresaId: oro.id,
    },
  });

  await oro.update({ gestionActualId: oroGestion.id });
  console.log(`Empresa: ${oro.nombre} (gestión ${oroGestion.year})`);

  // Empresa 2: ENALBO S.A.
  const [enalbo] = await Empresa.findOrCreate({
    where: { nit: '5012345678' },
    defaults: {
      nombre: 'ENALBO S.A.',
      nit: '5012345678',
      direccion: 'Av. Industrial #789, Zona Franca, La Paz, Bolivia',
      telefono: '+591 27778899',
      metodoEvaluacion: 'CPP',
    },
  });

  const [enalboGestion] = await Gestion.findOrCreate({
    where: { year: 2026, empresaId: enalbo.id },
    defaults: {
      year: 2026,
      glosa: 'Gestión Fiscal 2026',
      fechaInicio: '2026-01-01',
      fechaFin: '2026-12-31',
      actividad: 'Industrial - Fabricación de envases de aluminio',
      empresaId: enalbo.id,
    },
  });

  await enalbo.update({ gestionActualId: enalboGestion.id });
  console.log(`Empresa: ${enalbo.nombre} (gestión ${enalboGestion.year})`);

  console.log('  Creando plan de cuentas ENALBO...');
  const cuentasEnalbo = await PlanCuenta.count({ where: { empresaId: enalbo.id } });
  if (cuentasEnalbo === 0) {
    const cuentas = [
      { codigo: '1', nombre: 'Activo', nivel: 1, tipo: 'Activo', clase: 'Real', empresaId: enalbo.id },
      { codigo: '1.1', nombre: 'Activo Corriente', nivel: 2, tipo: 'Activo', clase: 'Real', empresaId: enalbo.id },
      { codigo: '1.1.1', nombre: 'Caja', nivel: 3, tipo: 'Activo', clase: 'Real', empresaId: enalbo.id },
      { codigo: '1.1.1.1', nombre: 'Caja MN', nivel: 4, tipo: 'Activo', clase: 'Real', empresaId: enalbo.id },
      { codigo: '1.1.2', nombre: 'Bancos', nivel: 3, tipo: 'Activo', clase: 'Real', empresaId: enalbo.id },
      { codigo: '1.1.2.1', nombre: 'Banco Unión MN', nivel: 4, tipo: 'Activo', clase: 'Real', empresaId: enalbo.id },
      { codigo: '1.1.3', nombre: 'Inventarios', nivel: 3, tipo: 'Activo', clase: 'Real', empresaId: enalbo.id },
      { codigo: '1.1.3.1', nombre: 'Materia Prima', nivel: 4, tipo: 'Activo', clase: 'Real', empresaId: enalbo.id },
      { codigo: '1.1.3.2', nombre: 'Producto Terminado', nivel: 4, tipo: 'Activo', clase: 'Real', empresaId: enalbo.id },
      { codigo: '1.1.4', nombre: 'Cuentas por Cobrar', nivel: 3, tipo: 'Activo', clase: 'Real', empresaId: enalbo.id },
      { codigo: '1.1.4.1', nombre: 'Clientes', nivel: 4, tipo: 'Activo', clase: 'Real', empresaId: enalbo.id },
      { codigo: '1.1.5', nombre: 'Crédito Fiscal IVA', nivel: 3, tipo: 'Activo', clase: 'Real', empresaId: enalbo.id },
      { codigo: '1.2', nombre: 'Activo No Corriente', nivel: 2, tipo: 'Activo', clase: 'Real', empresaId: enalbo.id },
      { codigo: '1.2.1', nombre: 'Maquinaria y Equipo', nivel: 3, tipo: 'Activo', clase: 'Real', empresaId: enalbo.id },
      { codigo: '1.2.2', nombre: 'Vehículos', nivel: 3, tipo: 'Activo', clase: 'Real', empresaId: enalbo.id },
      { codigo: '1.2.3', nombre: 'Edificios Industriales', nivel: 3, tipo: 'Activo', clase: 'Real', empresaId: enalbo.id },
      { codigo: '2', nombre: 'Pasivo', nivel: 1, tipo: 'Pasivo', clase: 'Real', empresaId: enalbo.id },
      { codigo: '2.1', nombre: 'Pasivo Corriente', nivel: 2, tipo: 'Pasivo', clase: 'Real', empresaId: enalbo.id },
      { codigo: '2.1.1', nombre: 'Cuentas por Pagar', nivel: 3, tipo: 'Pasivo', clase: 'Real', empresaId: enalbo.id },
      { codigo: '2.1.1.1', nombre: 'Proveedores Locales', nivel: 4, tipo: 'Pasivo', clase: 'Real', empresaId: enalbo.id },
      { codigo: '2.1.2', nombre: 'Impuestos por Pagar', nivel: 3, tipo: 'Pasivo', clase: 'Real', empresaId: enalbo.id },
      { codigo: '2.1.2.1', nombre: 'IVA Débito Fiscal', nivel: 4, tipo: 'Pasivo', clase: 'Real', empresaId: enalbo.id },
      { codigo: '2.1.3', nombre: 'Obligaciones Laborales', nivel: 3, tipo: 'Pasivo', clase: 'Real', empresaId: enalbo.id },
      { codigo: '2.2', nombre: 'Pasivo No Corriente', nivel: 2, tipo: 'Pasivo', clase: 'Real', empresaId: enalbo.id },
      { codigo: '2.2.1', nombre: 'Préstamos Bancarios LP', nivel: 3, tipo: 'Pasivo', clase: 'Real', empresaId: enalbo.id },
      { codigo: '3', nombre: 'Patrimonio', nivel: 1, tipo: 'Patrimonio', clase: 'Real', empresaId: enalbo.id },
      { codigo: '3.1', nombre: 'Capital Social', nivel: 2, tipo: 'Patrimonio', clase: 'Real', empresaId: enalbo.id },
      { codigo: '3.1.1', nombre: 'Capital Suscrito', nivel: 3, tipo: 'Patrimonio', clase: 'Real', empresaId: enalbo.id },
      { codigo: '3.2', nombre: 'Reservas', nivel: 2, tipo: 'Patrimonio', clase: 'Real', empresaId: enalbo.id },
      { codigo: '3.2.1', nombre: 'Reserva Legal', nivel: 3, tipo: 'Patrimonio', clase: 'Real', empresaId: enalbo.id },
      { codigo: '3.3', nombre: 'Resultados Acumulados', nivel: 2, tipo: 'Patrimonio', clase: 'Real', empresaId: enalbo.id },
      { codigo: '3.4', nombre: 'Resultado del Ejercicio', nivel: 2, tipo: 'Patrimonio', clase: 'Real', empresaId: enalbo.id },
      { codigo: '4', nombre: 'Ingresos', nivel: 1, tipo: 'Ingreso', clase: 'Nominal', empresaId: enalbo.id },
      { codigo: '4.1', nombre: 'Ventas', nivel: 2, tipo: 'Ingreso', clase: 'Nominal', empresaId: enalbo.id },
      { codigo: '4.1.1', nombre: 'Venta de Envases', nivel: 3, tipo: 'Ingreso', clase: 'Nominal', empresaId: enalbo.id },
      { codigo: '4.2', nombre: 'Otros Ingresos', nivel: 2, tipo: 'Ingreso', clase: 'Nominal', empresaId: enalbo.id },
      { codigo: '5', nombre: 'Gastos', nivel: 1, tipo: 'Gasto', clase: 'Nominal', empresaId: enalbo.id },
      { codigo: '5.1', nombre: 'Costo de Ventas', nivel: 2, tipo: 'Gasto', clase: 'Nominal', empresaId: enalbo.id },
      { codigo: '5.1.1', nombre: 'Materia Prima', nivel: 3, tipo: 'Gasto', clase: 'Nominal', empresaId: enalbo.id },
      { codigo: '5.2', nombre: 'Gastos Operativos', nivel: 2, tipo: 'Gasto', clase: 'Nominal', empresaId: enalbo.id },
      { codigo: '5.2.1', nombre: 'Sueldos', nivel: 3, tipo: 'Gasto', clase: 'Nominal', empresaId: enalbo.id },
      { codigo: '5.2.2', nombre: 'Servicios Básicos', nivel: 3, tipo: 'Gasto', clase: 'Nominal', empresaId: enalbo.id },
      { codigo: '5.2.3', nombre: 'Depreciación', nivel: 3, tipo: 'Gasto', clase: 'Nominal', empresaId: enalbo.id },
      { codigo: '5.2.4', nombre: 'Impuestos', nivel: 3, tipo: 'Gasto', clase: 'Nominal', empresaId: enalbo.id },
    ];

    for (const c of cuentas) {
      await PlanCuenta.findOrCreate({ where: { codigo: c.codigo, empresaId: enalbo.id }, defaults: c });
    }
    console.log(`Plan de cuentas ENALBO: ${cuentas.length} cuentas`);
  }

  // Demo Clientes/Proveedores
  const [usuarioAdmin] = await Usuario.findOrCreate({
    where: { username: 'admin' },
    defaults: { username: 'admin', email: 'admin@eicap.com', password: 'admin123', nombreCompleto: 'Admin' },
  });

  for (const empresa of [oro, enalbo]) {
    const clientesExistentes = await ClienteProveedor.count({ where: { empresaId: empresa.id } });
    if (clientesExistentes === 0) {
      const clientes = [
        { tipo: 'cliente', nit: '123456789', razonSocial: 'Supermercado Bolívar', telefono: '+591 72221111', empresaId: empresa.id },
        { tipo: 'cliente', nit: '987654321', razonSocial: 'Tienda La Esquina', telefono: '+591 72222222', empresaId: empresa.id },
        { tipo: 'proveedor', nit: '111222333', razonSocial: 'Distribuidora Mayorista Los Andes SRL', telefono: '+591 72223333', empresaId: empresa.id },
        { tipo: 'proveedor', nit: '444555666', razonSocial: 'Importadora Global Ltda.', telefono: '+591 72224444', empresaId: empresa.id },
        { tipo: 'ambos', nit: '777888999', razonSocial: 'Comercial Mixta Bolivia', telefono: '+591 72225555', empresaId: empresa.id },
      ];
      await ClienteProveedor.bulkCreate(clientes);
      console.log(`Clientes/Proveedores creados para: ${empresa.nombre}`);
    }

    // Productos demo
    const prodsExistentes = await Producto.count({ where: { empresaId: empresa.id } });
    if (prodsExistentes === 0) {
      let productos;
      if (empresa.id === oro.id) {
        productos = [
          { codigo: 'GAS001', nombre: 'Coca Cola 2L', categoria: 'Gaseosas', stockActual: 500, stockMinimo: 50, costoUnitario: 8.50, precioVenta: 12.00, empresaId: empresa.id },
          { codigo: 'GAS002', nombre: 'Sprite 2L', categoria: 'Gaseosas', stockActual: 300, stockMinimo: 30, costoUnitario: 8.00, precioVenta: 11.50, empresaId: empresa.id },
          { codigo: 'AGU001', nombre: 'Agua Vital 1L', categoria: 'Aguas', stockActual: 1000, stockMinimo: 100, costoUnitario: 3.50, precioVenta: 5.00, empresaId: empresa.id },
          { codigo: 'CER001', nombre: 'Cerveza Paceña 620ml', categoria: 'Cervezas', stockActual: 200, stockMinimo: 40, costoUnitario: 7.00, precioVenta: 10.00, empresaId: empresa.id },
          { codigo: 'JGO001', nombre: 'Jugo del Valle 1L', categoria: 'Jugos', stockActual: 150, stockMinimo: 20, costoUnitario: 6.00, precioVenta: 9.00, empresaId: empresa.id },
          { codigo: 'ENE001', nombre: 'Monster Energy 500ml', categoria: 'Bebidas Energéticas', stockActual: 80, stockMinimo: 10, costoUnitario: 10.00, precioVenta: 15.00, empresaId: empresa.id },
        ];
      } else {
        productos = [
          { codigo: 'LAT001', nombre: 'Lata Aluminio 355ml Estándar', categoria: 'Latas Estándar', stockActual: 10000, stockMinimo: 1000, costoUnitario: 0.50, precioVenta: 0.75, empresaId: empresa.id },
          { codigo: 'LAT002', nombre: 'Lata Aluminio 473ml Premium', categoria: 'Latas Premium', stockActual: 5000, stockMinimo: 500, costoUnitario: 0.65, precioVenta: 0.95, empresaId: empresa.id },
          { codigo: 'LAT003', nombre: 'Tapa Fácil Apertura 355ml', categoria: 'Tapas', stockActual: 20000, stockMinimo: 2000, costoUnitario: 0.08, precioVenta: 0.12, empresaId: empresa.id },
          { codigo: 'BAL001', nombre: 'Bobina Aluminio 0.25mm', categoria: 'Materia Prima', stockActual: 5000, stockMinimo: 500, costoUnitario: 2.50, precioVenta: 3.50, empresaId: empresa.id, unidadMedida: 'KG' },
          { codigo: 'BAL002', nombre: 'Bobina Aluminio 0.30mm', categoria: 'Materia Prima', stockActual: 3000, stockMinimo: 300, costoUnitario: 3.00, precioVenta: 4.20, empresaId: empresa.id, unidadMedida: 'KG' },
          { codigo: 'TIN001', nombre: 'Tinta UV Roja', categoria: 'Insumos', stockActual: 200, stockMinimo: 50, costoUnitario: 15.00, precioVenta: 22.00, empresaId: empresa.id, unidadMedida: 'L' },
        ];
      }
      await Producto.bulkCreate(productos);
      console.log(`Productos creados para: ${empresa.nombre}`);
    }
  }

  console.log('Seed de empresas completado.');
}

module.exports = seedEmpresas;
