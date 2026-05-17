const { Rol, Permiso, RolPermiso } = require('../models');

async function listar(req, res) {
  try {
    const roles = await Rol.findAll({
      include: [{ model: Permiso, through: { attributes: [] } }],
      order: [['id', 'ASC']],
    });
    res.json(roles);
  } catch (error) {
    res.status(500).json({ error: 'Error al listar roles' });
  }
}

async function obtener(req, res) {
  try {
    const rol = await Rol.findByPk(req.params.id, {
      include: [{ model: Permiso, through: { attributes: [] } }],
    });

    if (!rol) {
      return res.status(404).json({ error: 'Rol no encontrado' });
    }

    res.json(rol);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener rol' });
  }
}

async function crear(req, res) {
  try {
    const { nombre, descripcion } = req.body;

    const rol = await Rol.create({ nombre, descripcion });

    res.status(201).json(rol);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear rol' });
  }
}

async function actualizar(req, res) {
  try {
    const { nombre, descripcion } = req.body;

    const rol = await Rol.findByPk(req.params.id);

    if (!rol) {
      return res.status(404).json({ error: 'Rol no encontrado' });
    }

    await rol.update({ nombre, descripcion });

    res.json(rol);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar rol' });
  }
}

async function asignarPermisos(req, res) {
  try {
    const { permisosIds } = req.body;

    const rol = await Rol.findByPk(req.params.id);

    if (!rol) {
      return res.status(404).json({ error: 'Rol no encontrado' });
    }

    await rol.setPermisos(permisosIds || []);

    const rolActualizado = await Rol.findByPk(req.params.id, {
      include: [{ model: Permiso, through: { attributes: [] } }],
    });

    res.json(rolActualizado);
  } catch (error) {
    res.status(500).json({ error: 'Error al asignar permisos' });
  }
}

async function eliminar(req, res) {
  try {
    const rol = await Rol.findByPk(req.params.id);

    if (!rol) {
      return res.status(404).json({ error: 'Rol no encontrado' });
    }

    await rol.destroy();

    res.json({ mensaje: 'Rol eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar rol' });
  }
}

async function listarPermisos(req, res) {
  try {
    const permisos = await Permiso.findAll({
      order: [['modulo', 'ASC'], ['codigo', 'ASC']],
    });
    res.json(permisos);
  } catch (error) {
    res.status(500).json({ error: 'Error al listar permisos' });
  }
}

module.exports = { listar, obtener, crear, actualizar, asignarPermisos, eliminar, listarPermisos };
