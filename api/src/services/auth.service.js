const jwt = require('jsonwebtoken');

function generarToken(usuario) {
  return jwt.sign(
    {
      id: usuario.id,
      username: usuario.username,
      email: usuario.email,
      rolId: usuario.rolId,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
}

module.exports = { generarToken };
