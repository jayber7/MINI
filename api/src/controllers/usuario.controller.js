const { Usuario, Rol } = require('../models');

async function listar(req, res) {
  try {
    const usuarios = await Usuario.findAll({
      include: [{ model: Rol, attributes: ['id', 'nombre'] }],
      order: [['id', 'ASC']],
    });
    res.json(usuarios);
  } catch (error) {
    res.status(500).json({ error: 'Error al listar usuarios' });
  }
}

async function obtener(req, res) {
  try {
    const usuario = await Usuario.findByPk(req.params.id, {
      include: [{ model: Rol }],
    });

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(usuario);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener usuario' });
  }
}

async function crear(req, res) {
  try {
    const { username, email, password, nombreCompleto, rolId, activo } = req.body;

    const usuarioExistente = await Usuario.findOne({
      where: { username },
    });

    if (usuarioExistente) {
      return res.status(409).json({ error: 'El username ya está en uso' });
    }

    const usuario = await Usuario.create({
      username,
      email,
      password,
      nombreCompleto,
      rolId,
      activo: activo !== undefined ? activo : true,
    });

    res.status(201).json(usuario);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear usuario' });
  }
}

async function actualizar(req, res) {
  try {
    const { username, email, nombreCompleto, rolId, activo } = req.body;

    const usuario = await Usuario.findByPk(req.params.id);

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    await usuario.update({
      username: username || usuario.username,
      email: email || usuario.email,
      nombreCompleto: nombreCompleto || usuario.nombreCompleto,
      rolId: rolId !== undefined ? rolId : usuario.rolId,
      activo: activo !== undefined ? activo : usuario.activo,
    });

    res.json(usuario);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
}

async function cambiarPassword(req, res) {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'La nueva contraseña es requerida' });
    }

    const usuario = await Usuario.findByPk(req.params.id);

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    await usuario.update({ password });

    res.json({ mensaje: 'Contraseña actualizada correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al cambiar contraseña' });
  }
}

async function eliminar(req, res) {
  try {
    const usuario = await Usuario.findByPk(req.params.id);

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    await usuario.destroy();

    res.json({ mensaje: 'Usuario eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar usuario' });
  }
}

module.exports = { listar, obtener, crear, actualizar, cambiarPassword, eliminar };
