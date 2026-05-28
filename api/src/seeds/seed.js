const { Rol, Permiso, Usuario } = require('../models');

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

  console.log('Seeds base completados exitosamente');
}

const seedEmpresas = require('./seedEmpresas');

async function runAllSeeds() {
  await seedEmpresas();
  await seed();
}

module.exports = runAllSeeds;
