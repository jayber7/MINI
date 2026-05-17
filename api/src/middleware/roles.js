const { Permiso, Rol, RolPermiso } = require('../models');

function requirePermisos(...permisosRequeridos) {
  return async (req, res, next) => {
    try {
      const usuarioId = req.usuario.id;

      const usuario = await req.models.Usuario.findByPk(usuarioId, {
        include: [
          {
            model: req.models.Rol,
            include: [
              {
                model: req.models.Permiso,
                through: { attributes: [] },
              },
            ],
          },
        ],
      });

      if (!usuario) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      if (!usuario.Rol) {
        return res.status(403).json({ error: 'Usuario sin rol asignado' });
      }

      const permisosUsuario = usuario.Rol.Permisos.map((p) => p.codigo);

      const tienePermiso = permisosRequeridos.some((p) =>
        permisosUsuario.includes(p)
      );

      if (!tienePermiso) {
        return res.status(403).json({
          error: 'No tienes permisos para realizar esta acción',
        });
      }

      next();
    } catch (error) {
      res.status(500).json({ error: 'Error verificando permisos' });
    }
  };
}

function requireRol(...rolesRequeridos) {
  return async (req, res, next) => {
    try {
      const usuarioId = req.usuario.id;

      const usuario = await req.models.Usuario.findByPk(usuarioId, {
        include: [
          {
            model: req.models.Rol,
          },
        ],
      });

      if (!usuario || !usuario.Rol) {
        return res.status(403).json({ error: 'Usuario sin rol asignado' });
      }

      if (!rolesRequeridos.includes(usuario.Rol.nombre)) {
        return res.status(403).json({
          error: 'No tienes el rol requerido para esta acción',
        });
      }

      next();
    } catch (error) {
      res.status(500).json({ error: 'Error verificando rol' });
    }
  };
}

module.exports = { requirePermisos, requireRol };
