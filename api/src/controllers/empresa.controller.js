const { Empresa } = require('../models');

async function listar(req, res) {
  try {
    const empresas = await Empresa.findAll();
    res.json(empresas);
  } catch (error) {
    res.status(500).json({ error: 'Error al listar empresas' });
  }
}

async function obtener(req, res) {
  try {
    const empresa = await Empresa.findByPk(req.params.id);

    if (!empresa) {
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }

    res.json(empresa);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener empresa' });
  }
}

async function obtenerPrimera(req, res) {
  try {
    const empresa = await Empresa.findOne();

    if (!empresa) {
      return res.status(404).json({ error: 'No hay empresas registradas' });
    }

    res.json(empresa);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener empresa' });
  }
}

async function crear(req, res) {
  try {
    const empresa = await Empresa.create(req.body);
    res.status(201).json(empresa);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear empresa' });
  }
}

async function actualizar(req, res) {
  try {
    const empresa = await Empresa.findByPk(req.params.id);

    if (!empresa) {
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }

    await empresa.update(req.body);
    res.json(empresa);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar empresa' });
  }
}

async function eliminar(req, res) {
  try {
    const empresa = await Empresa.findByPk(req.params.id);

    if (!empresa) {
      return res.status(404).json({ error: 'Empresa no encontrada' });
    }

    await empresa.destroy();
    res.json({ mensaje: 'Empresa eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar empresa' });
  }
}

module.exports = { listar, obtener, obtenerPrimera, crear, actualizar, eliminar };
