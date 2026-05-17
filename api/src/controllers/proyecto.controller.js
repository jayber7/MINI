const { Proyecto, Empresa } = require('../models');

async function listar(req, res) {
  try {
    const proyectos = await Proyecto.findAll({
      order: [['nombre', 'ASC']],
    });
    res.json(proyectos);
  } catch (error) {
    res.status(500).json({ error: 'Error al listar proyectos' });
  }
}

async function obtener(req, res) {
  try {
    const proyecto = await Proyecto.findByPk(req.params.id);

    if (!proyecto) {
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }

    res.json(proyecto);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener proyecto' });
  }
}

async function crear(req, res) {
  try {
    const { nombre } = req.body;

    const empresa = await Empresa.findOne();

    const proyecto = await Proyecto.create({
      nombre,
      empresaId: empresa ? empresa.id : 1,
    });

    res.status(201).json(proyecto);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear proyecto' });
  }
}

async function actualizar(req, res) {
  try {
    const proyecto = await Proyecto.findByPk(req.params.id);

    if (!proyecto) {
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }

    await proyecto.update(req.body);
    res.json(proyecto);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar proyecto' });
  }
}

async function eliminar(req, res) {
  try {
    const proyecto = await Proyecto.findByPk(req.params.id);

    if (!proyecto) {
      return res.status(404).json({ error: 'Proyecto no encontrado' });
    }

    await proyecto.destroy();
    res.json({ mensaje: 'Proyecto eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar proyecto' });
  }
}

module.exports = { listar, obtener, crear, actualizar, eliminar };
