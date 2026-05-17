const { Usuario, Rol } = require('../models');
const { generarToken } = require('../services/auth.service');

async function login(req, res) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username y password son requeridos' });
    }

    const usuario = await Usuario.findOne({
      where: { username },
      include: [{ model: Rol }],
    });

    if (!usuario) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    if (!usuario.activo) {
      return res.status(403).json({ error: 'Usuario desactivado' });
    }

    const passwordValido = await usuario.validarPassword(password);

    if (!passwordValido) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = generarToken(usuario);

    const permisos = usuario.Rol?.Permisos?.map((p) => p.codigo) || [];

    res.json({
      token,
      usuario: {
        id: usuario.id,
        username: usuario.username,
        email: usuario.email,
        nombreCompleto: usuario.nombreCompleto,
        rol: usuario.Rol ? usuario.Rol.nombre : null,
        permisos,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
}

async function register(req, res) {
  try {
    const { username, email, password, nombreCompleto, rolId } = req.body;

    if (!username || !email || !password || !nombreCompleto) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    const usuarioExistente = await Usuario.findOne({
      where: { username },
    });

    if (usuarioExistente) {
      return res.status(409).json({ error: 'El username ya está en uso' });
    }

    const emailExistente = await Usuario.findOne({
      where: { email },
    });

    if (emailExistente) {
      return res.status(409).json({ error: 'El email ya está en uso' });
    }

    const usuario = await Usuario.create({
      username,
      email,
      password,
      nombreCompleto,
      rolId: rolId || null,
    });

    const token = generarToken(usuario);

    res.status(201).json({
      token,
      usuario: {
        id: usuario.id,
        username: usuario.username,
        email: usuario.email,
        nombreCompleto: usuario.nombreCompleto,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
}

async function getMe(req, res) {
  try {
    const usuario = await Usuario.findByPk(req.usuario.id, {
      include: [{ model: Rol }],
    });

    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const permisos = usuario.Rol?.Permisos?.map((p) => p.codigo) || [];

    res.json({
      id: usuario.id,
      username: usuario.username,
      email: usuario.email,
      nombreCompleto: usuario.nombreCompleto,
      activo: usuario.activo,
      rol: usuario.Rol ? usuario.Rol.nombre : null,
      permisos,
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
}

module.exports = { login, register, getMe };
