const { Rol, Permiso, Usuario, Empresa, Gestion, PlanCuenta } = require('../models');

async function seed() {
  console.log('Ejecutando seeds...');

  // Crear permisos
  const permisos = [
    { nombre: 'Ver Usuarios', codigo: 'usuarios:read', modulo: 'usuarios' },
    { nombre: 'Crear Usuarios', codigo: 'usuarios:create', modulo: 'usuarios' },
    { nombre: 'Editar Usuarios', codigo: 'usuarios:update', modulo: 'usuarios' },
    { nombre: 'Eliminar Usuarios', codigo: 'usuarios:delete', modulo: 'usuarios' },
    { nombre: 'Ver Roles', codigo: 'roles:read', modulo: 'roles' },
    { nombre: 'Crear Roles', codigo: 'roles:create', modulo: 'roles' },
    { nombre: 'Editar Roles', codigo: 'roles:update', modulo: 'roles' },
    { nombre: 'Eliminar Roles', codigo: 'roles:delete', modulo: 'roles' },
    { nombre: 'Ver Plan de Cuentas', codigo: 'plan:read', modulo: 'plan' },
    { nombre: 'Crear Plan de Cuentas', codigo: 'plan:create', modulo: 'plan' },
    { nombre: 'Editar Plan de Cuentas', codigo: 'plan:update', modulo: 'plan' },
    { nombre: 'Eliminar Plan de Cuentas', codigo: 'plan:delete', modulo: 'plan' },
    { nombre: 'Ver Comprobantes', codigo: 'comprobantes:read', modulo: 'comprobantes' },
    { nombre: 'Crear Comprobantes', codigo: 'comprobantes:create', modulo: 'comprobantes' },
    { nombre: 'Editar Comprobantes', codigo: 'comprobantes:update', modulo: 'comprobantes' },
    { nombre: 'Anular Comprobantes', codigo: 'comprobantes:anular', modulo: 'comprobantes' },
    { nombre: 'Contabilizar Comprobantes', codigo: 'comprobantes:contabilizar', modulo: 'comprobantes' },
    { nombre: 'Ver Reportes', codigo: 'reportes:read', modulo: 'reportes' },
    { nombre: 'Exportar Reportes', codigo: 'reportes:export', modulo: 'reportes' },
    { nombre: 'Configuración', codigo: 'config:update', modulo: 'config' },
  ];

  for (const p of permisos) {
    await Permiso.findOrCreate({ where: { codigo: p.codigo }, defaults: p });
  }

  console.log('Permisos creados');

  // Crear roles
  const [adminRol] = await Rol.findOrCreate({
    where: { nombre: 'admin' },
    defaults: { nombre: 'admin', descripcion: 'Administrador del sistema' },
  });

  const [contadorRol] = await Rol.findOrCreate({
    where: { nombre: 'contador' },
    defaults: { nombre: 'contador', descripcion: 'Contador principal' },
  });

  const [auxiliarRol] = await Rol.findOrCreate({
    where: { nombre: 'auxiliar' },
    defaults: { nombre: 'auxiliar', descripcion: 'Auxiliar contable' },
  });

  console.log('Roles creados');

  // Asignar permisos a roles
  const todosPermisos = await Permiso.findAll();
  await adminRol.setPermisos(todosPermisos);

  const permisosContador = await Permiso.findAll({
    where: {
      codigo: {
        [require('sequelize').Op.notIn]: [
          'usuarios:create',
          'usuarios:update',
          'usuarios:delete',
          'roles:create',
          'roles:update',
          'roles:delete',
          'config:update',
        ],
      },
    },
  });
  await contadorRol.setPermisos(permisosContador);

  const permisosAuxiliar = await Permiso.findAll({
    where: {
      codigo: [
        'plan:read',
        'comprobantes:read',
        'comprobantes:create',
        'comprobantes:update',
        'reportes:read',
        'reportes:export',
      ],
    },
  });
  await auxiliarRol.setPermisos(permisosAuxiliar);

  console.log('Permisos asignados a roles');

  // Crear usuario admin por defecto
  const [adminUser, adminCreated] = await Usuario.findOrCreate({
    where: { username: 'admin' },
    defaults: {
      username: 'admin',
      email: 'admin@eicap.com',
      password: 'admin123',
      nombreCompleto: 'Administrador',
      rolId: adminRol.id,
      activo: true,
    },
  });

  // Si el usuario ya existía pero no tenía rol, actualizarlo
  if (!adminCreated && !adminUser.rolId) {
    await adminUser.update({ rolId: adminRol.id });
  }

  console.log('Usuario admin creado (username: admin, password: admin123)');

  // Crear o usar empresa existente
  let empresa = await Empresa.findOne();
  if (!empresa) {
    [empresa] = await Empresa.findOrCreate({
      where: { nombre: 'Mi Empresa Académica' },
      defaults: {
        nombre: 'Mi Empresa Académica',
        nit: '123456789',
        direccion: 'Calle Principal #123',
        telefono: '+591 12345678',
      },
    });
  }

  console.log('Empresa: ' + empresa.nombre);

  // Crear gestión por defecto si no existe
  let gestion = await Gestion.findOne({ where: { year: 2026, empresaId: empresa.id } });
  if (!gestion) {
    [gestion] = await Gestion.findOrCreate({
      where: { year: 2026, empresaId: empresa.id },
      defaults: {
        year: 2026,
        glosa: 'Gestión Fiscal 2026',
        fechaInicio: '2026-01-01',
        fechaFin: '2026-12-31',
        actividad: 'Comercial',
        empresaId: empresa.id,
      },
    });
  }

  await empresa.update({ gestionActualId: gestion.id });

  console.log('Gestión: ' + gestion.year);

  // Crear plan de cuentas básico si no existe
  const cuentasExistentes = await PlanCuenta.count({ where: { empresaId: empresa.id } });
  if (cuentasExistentes > 0) {
    console.log('Plan de cuentas ya existe (' + cuentasExistentes + ' cuentas), saltando.');
  } else {
    const cuentasSeed = [
    // ===== ACTIVO (Nivel 1) =====
    { codigo: '1', nombre: 'Activo', nivel: 1, tipo: 'Activo', clase: 'Real', empresaId: empresa.id },
    { codigo: '1.1', nombre: 'Activo Corriente', nivel: 2, tipo: 'Activo', clase: 'Real', empresaId: empresa.id },
    { codigo: '1.1.1', nombre: 'Caja', nivel: 3, tipo: 'Activo', clase: 'Real', empresaId: empresa.id },
    { codigo: '1.1.1.1', nombre: 'Caja Moneda Nacional', nivel: 4, tipo: 'Activo', clase: 'Real', empresaId: empresa.id },
    { codigo: '1.1.1.1.1', nombre: 'Caja General', nivel: 5, tipo: 'Activo', clase: 'Real', empresaId: empresa.id },
    { codigo: '1.1.1.2', nombre: 'Caja Moneda Extranjera', nivel: 4, tipo: 'Activo', clase: 'Real', empresaId: empresa.id },
    { codigo: '1.1.2', nombre: 'Bancos', nivel: 3, tipo: 'Activo', clase: 'Real', empresaId: empresa.id },
    { codigo: '1.1.2.1', nombre: 'Banco Unión', nivel: 4, tipo: 'Activo', clase: 'Real', empresaId: empresa.id },
    { codigo: '1.1.2.2', nombre: 'Banco Mercantil Santa Cruz', nivel: 4, tipo: 'Activo', clase: 'Real', empresaId: empresa.id },
    { codigo: '1.1.3', nombre: 'Inventarios', nivel: 3, tipo: 'Activo', clase: 'Real', empresaId: empresa.id },
    { codigo: '1.1.3.1', nombre: 'Mercaderías', nivel: 4, tipo: 'Activo', clase: 'Real', empresaId: empresa.id },
    { codigo: '1.1.4', nombre: 'Cuentas por Cobrar', nivel: 3, tipo: 'Activo', clase: 'Real', empresaId: empresa.id },
    { codigo: '1.1.4.1', nombre: 'Cuentas por Cobrar Clientes', nivel: 4, tipo: 'Activo', clase: 'Real', empresaId: empresa.id },
    { codigo: '1.1.4.2', nombre: 'Cuentas por Cobrar Personal', nivel: 4, tipo: 'Activo', clase: 'Real', empresaId: empresa.id },
    { codigo: '1.1.5', nombre: 'Crédito Fiscal IVA', nivel: 3, tipo: 'Activo', clase: 'Real', empresaId: empresa.id },
    { codigo: '1.1.5.1', nombre: 'Crédito Fiscal IVA Compras', nivel: 4, tipo: 'Activo', clase: 'Real', empresaId: empresa.id },
    { codigo: '1.1.6', nombre: 'Anticipo de Impuestos', nivel: 3, tipo: 'Activo', clase: 'Real', empresaId: empresa.id },
    { codigo: '1.2', nombre: 'Activo No Corriente', nivel: 2, tipo: 'Activo', clase: 'Real', empresaId: empresa.id },
    { codigo: '1.2.1', nombre: 'Mobiliario y Equipo', nivel: 3, tipo: 'Activo', clase: 'Real', empresaId: empresa.id },
    { codigo: '1.2.1.1', nombre: 'Mobiliario de Oficina', nivel: 4, tipo: 'Activo', clase: 'Real', empresaId: empresa.id },
    { codigo: '1.2.1.2', nombre: 'Equipo de Computación', nivel: 4, tipo: 'Activo', clase: 'Real', empresaId: empresa.id },
    { codigo: '1.2.2', nombre: 'Vehículos', nivel: 3, tipo: 'Activo', clase: 'Real', empresaId: empresa.id },
    { codigo: '1.2.3', nombre: 'Terrenos', nivel: 3, tipo: 'Activo', clase: 'Real', empresaId: empresa.id },
    { codigo: '1.2.4', nombre: 'Edificios', nivel: 3, tipo: 'Activo', clase: 'Real', empresaId: empresa.id },
    { codigo: '1.2.5', nombre: 'Depreciación Acumulada', nivel: 3, tipo: 'Activo', clase: 'Real', empresaId: empresa.id },
    { codigo: '1.2.5.1', nombre: 'Dep. Acum. Mobiliario y Equipo', nivel: 4, tipo: 'Activo', clase: 'Real', empresaId: empresa.id },
    { codigo: '1.2.5.2', nombre: 'Dep. Acum. Vehículos', nivel: 4, tipo: 'Activo', clase: 'Real', empresaId: empresa.id },
    { codigo: '1.2.5.3', nombre: 'Dep. Acum. Edificios', nivel: 4, tipo: 'Activo', clase: 'Real', empresaId: empresa.id },

    // ===== PASIVO (Nivel 1) =====
    { codigo: '2', nombre: 'Pasivo', nivel: 1, tipo: 'Pasivo', clase: 'Real', empresaId: empresa.id },
    { codigo: '2.1', nombre: 'Pasivo Corriente', nivel: 2, tipo: 'Pasivo', clase: 'Real', empresaId: empresa.id },
    { codigo: '2.1.1', nombre: 'Cuentas por Pagar', nivel: 3, tipo: 'Pasivo', clase: 'Real', empresaId: empresa.id },
    { codigo: '2.1.1.1', nombre: 'Cuentas por Pagar Proveedores', nivel: 4, tipo: 'Pasivo', clase: 'Real', empresaId: empresa.id },
    { codigo: '2.1.2', nombre: 'Sueldos por Pagar', nivel: 3, tipo: 'Pasivo', clase: 'Real', empresaId: empresa.id },
    { codigo: '2.1.3', nombre: 'Impuestos por Pagar', nivel: 3, tipo: 'Pasivo', clase: 'Real', empresaId: empresa.id },
    { codigo: '2.1.3.1', nombre: 'Débito Fiscal IVA', nivel: 4, tipo: 'Pasivo', clase: 'Real', empresaId: empresa.id },
    { codigo: '2.1.3.2', nombre: 'IT por Pagar', nivel: 4, tipo: 'Pasivo', clase: 'Real', empresaId: empresa.id },
    { codigo: '2.1.3.3', nombre: 'RC-IVA por Pagar', nivel: 4, tipo: 'Pasivo', clase: 'Real', empresaId: empresa.id },
    { codigo: '2.1.3.4', nombre: 'IUE por Pagar', nivel: 4, tipo: 'Pasivo', clase: 'Real', empresaId: empresa.id },
    { codigo: '2.2', nombre: 'Pasivo No Corriente', nivel: 2, tipo: 'Pasivo', clase: 'Real', empresaId: empresa.id },
    { codigo: '2.2.1', nombre: 'Préstamos Bancarios L/P', nivel: 3, tipo: 'Pasivo', clase: 'Real', empresaId: empresa.id },

    // ===== PATRIMONIO (Nivel 1) =====
    { codigo: '3', nombre: 'Patrimonio', nivel: 1, tipo: 'Patrimonio', clase: 'Real', empresaId: empresa.id },
    { codigo: '3.1', nombre: 'Capital Social', nivel: 2, tipo: 'Patrimonio', clase: 'Real', empresaId: empresa.id },
    { codigo: '3.1.1', nombre: 'Capital Social Suscrito', nivel: 3, tipo: 'Patrimonio', clase: 'Real', empresaId: empresa.id },
    { codigo: '3.2', nombre: 'Utilidades Retenidas', nivel: 2, tipo: 'Patrimonio', clase: 'Real', empresaId: empresa.id },
    { codigo: '3.2.1', nombre: 'Reserva Legal', nivel: 3, tipo: 'Patrimonio', clase: 'Real', empresaId: empresa.id },
    { codigo: '3.2.2', nombre: 'Utilidades No Distribuidas', nivel: 3, tipo: 'Patrimonio', clase: 'Real', empresaId: empresa.id },
    { codigo: '3.3', nombre: 'Resultado del Ejercicio', nivel: 2, tipo: 'Patrimonio', clase: 'Real', empresaId: empresa.id },

    // ===== INGRESOS (Nivel 1) =====
    { codigo: '4', nombre: 'Ingresos', nivel: 1, tipo: 'Ingreso', clase: 'Nominal', empresaId: empresa.id },
    { codigo: '4.1', nombre: 'Ingresos por Ventas', nivel: 2, tipo: 'Ingreso', clase: 'Nominal', empresaId: empresa.id },
    { codigo: '4.1.1', nombre: 'Ventas de Mercadería', nivel: 3, tipo: 'Ingreso', clase: 'Nominal', empresaId: empresa.id },
    { codigo: '4.1.1.1', nombre: 'Ventas Producto A', nivel: 4, tipo: 'Ingreso', clase: 'Nominal', empresaId: empresa.id },
    { codigo: '4.1.1.2', nombre: 'Ventas Producto B', nivel: 4, tipo: 'Ingreso', clase: 'Nominal', empresaId: empresa.id },
    { codigo: '4.1.2', nombre: 'Ventas de Servicios', nivel: 3, tipo: 'Ingreso', clase: 'Nominal', empresaId: empresa.id },
    { codigo: '4.2', nombre: 'Otros Ingresos', nivel: 2, tipo: 'Ingreso', clase: 'Nominal', empresaId: empresa.id },
    { codigo: '4.2.1', nombre: 'Ingresos Financieros', nivel: 3, tipo: 'Ingreso', clase: 'Nominal', empresaId: empresa.id },
    { codigo: '4.2.2', nombre: 'Otros Ingresos No Operacionales', nivel: 3, tipo: 'Ingreso', clase: 'Nominal', empresaId: empresa.id },

    // ===== GASTOS (Nivel 1) =====
    { codigo: '5', nombre: 'Gastos', nivel: 1, tipo: 'Gasto', clase: 'Nominal', empresaId: empresa.id },
    { codigo: '5.1', nombre: 'Costo de Ventas', nivel: 2, tipo: 'Gasto', clase: 'Nominal', empresaId: empresa.id },
    { codigo: '5.1.1', nombre: 'Compras de Mercadería', nivel: 3, tipo: 'Gasto', clase: 'Nominal', empresaId: empresa.id },
    { codigo: '5.1.1.1', nombre: 'Costo de Ventas Producto A', nivel: 4, tipo: 'Gasto', clase: 'Nominal', empresaId: empresa.id },
    { codigo: '5.1.1.2', nombre: 'Costo de Ventas Producto B', nivel: 4, tipo: 'Gasto', clase: 'Nominal', empresaId: empresa.id },
    { codigo: '5.2', nombre: 'Gastos de Operación', nivel: 2, tipo: 'Gasto', clase: 'Nominal', empresaId: empresa.id },
    { codigo: '5.2.1', nombre: 'Sueldos y Salarios', nivel: 3, tipo: 'Gasto', clase: 'Nominal', empresaId: empresa.id },
    { codigo: '5.2.2', nombre: 'Alquileres', nivel: 3, tipo: 'Gasto', clase: 'Nominal', empresaId: empresa.id },
    { codigo: '5.2.3', nombre: 'Servicios Básicos', nivel: 3, tipo: 'Gasto', clase: 'Nominal', empresaId: empresa.id },
    { codigo: '5.2.4', nombre: 'Depreciación', nivel: 3, tipo: 'Gasto', clase: 'Nominal', empresaId: empresa.id },
    { codigo: '5.2.5', nombre: 'Gastos Administrativos', nivel: 3, tipo: 'Gasto', clase: 'Nominal', empresaId: empresa.id },
    { codigo: '5.2.6', nombre: 'Impuestos', nivel: 3, tipo: 'Gasto', clase: 'Nominal', empresaId: empresa.id },
    { codigo: '5.2.6.1', nombre: 'Impuesto a las Transacciones (IT)', nivel: 4, tipo: 'Gasto', clase: 'Nominal', empresaId: empresa.id },
    { codigo: '5.2.6.2', nombre: 'RC-IVA', nivel: 4, tipo: 'Gasto', clase: 'Nominal', empresaId: empresa.id },
    { codigo: '5.2.6.3', nombre: 'IUE', nivel: 4, tipo: 'Gasto', clase: 'Nominal', empresaId: empresa.id },
    { codigo: '5.2.7', nombre: 'Gastos Financieros', nivel: 3, tipo: 'Gasto', clase: 'Nominal', empresaId: empresa.id },

    // ===== CUENTAS DE ORDEN (Nivel 1) =====
    { codigo: '6', nombre: 'Cuentas de Orden', nivel: 1, tipo: 'Orden', clase: 'Orden', empresaId: empresa.id },
    { codigo: '6.1', nombre: 'Deudoras', nivel: 2, tipo: 'Orden', clase: 'Orden', empresaId: empresa.id },
    { codigo: '6.1.1', nombre: 'Documentos en Cobranza', nivel: 3, tipo: 'Orden', clase: 'Orden', empresaId: empresa.id },
    { codigo: '6.2', nombre: 'Acreedoras', nivel: 2, tipo: 'Orden', clase: 'Orden', empresaId: empresa.id },
    { codigo: '6.2.1', nombre: 'Documentos en Garantía', nivel: 3, tipo: 'Orden', clase: 'Orden', empresaId: empresa.id },

    // ===== CUENTAS CONTINGENTES (Nivel 1) =====
    { codigo: '7', nombre: 'Cuentas Contingentes', nivel: 1, tipo: 'Contingentes', clase: 'Contingentes', empresaId: empresa.id },
    { codigo: '7.1', nombre: 'Activos Contingentes', nivel: 2, tipo: 'Contingentes', clase: 'Contingentes', empresaId: empresa.id },
    { codigo: '7.2', nombre: 'Pasivos Contingentes', nivel: 2, tipo: 'Contingentes', clase: 'Contingentes', empresaId: empresa.id },
  ];

  for (const c of cuentasSeed) {
    await PlanCuenta.findOrCreate({
      where: { codigo: c.codigo, empresaId: empresa.id },
      defaults: c,
    });
  }

  console.log('Plan de cuentas creado (' + cuentasSeed.length + ' cuentas)');
  }

  console.log('Seeds base completados exitosamente');
}

// Seed de datos de Zapatería Elegante SRL (2 gestiones con movimientos)
const seedZapateria = require('./seedZapateria');

async function runAllSeeds() {
  await seed();
  await seedZapateria();
}

module.exports = runAllSeeds;
