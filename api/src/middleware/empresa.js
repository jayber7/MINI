const { Empresa } = require('../models');

async function empresaMiddleware(req, res, next) {
  try {
    const empresaId = req.headers['x-empresa-id'] || req.query.empresaId;

    if (empresaId) {
      const empresa = await Empresa.findByPk(parseInt(empresaId));
      if (empresa) {
        req.empresaId = empresa.id;
        req.empresa = empresa;
        return next();
      }
    }

    const empresa = await Empresa.findOne({ order: [['id', 'ASC']] });
    if (empresa) {
      req.empresaId = empresa.id;
      req.empresa = empresa;
    }

    next();
  } catch (error) {
    console.error('Error en empresa middleware:', error);
    next();
  }
}

module.exports = empresaMiddleware;
