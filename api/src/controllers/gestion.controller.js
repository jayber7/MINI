const { Gestion, Empresa } = require('../models');

async function listar(req, res) {
  try {
    const gestiones = await Gestion.findAll({
      order: [['year', 'DESC']],
    });
    res.json(gestiones);
  } catch (error) {
    res.status(500).json({ error: 'Error al listar gestiones' });
  }
}

async function obtener(req, res) {
  try {
    const gestion = await Gestion.findByPk(req.params.id);

    if (!gestion) {
      return res.status(404).json({ error: 'Gestión no encontrada' });
    }

    res.json(gestion);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener gestión' });
  }
}

async function obtenerActual(req, res) {
  try {
    const empresa = await Empresa.findOne();

    if (!empresa || !empresa.gestionActualId) {
      return res.status(404).json({ error: 'No hay gestión actual configurada' });
    }

    const gestion = await Gestion.findByPk(empresa.gestionActualId);

    if (!gestion) {
      return res.status(404).json({ error: 'Gestión actual no encontrada' });
    }

    res.json(gestion);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener gestión actual' });
  }
}

async function crear(req, res) {
  try {
    const { year, glosa, fechaInicio, fechaFin, actividad } = req.body;

    const empresa = await Empresa.findOne();

    const gestion = await Gestion.create({
      year,
      glosa: glosa || `Gestión Fiscal ${year}`,
      fechaInicio: fechaInicio || `${year}-01-01`,
      fechaFin: fechaFin || `${year}-12-31`,
      actividad: actividad || 'Comercial',
      empresaId: empresa ? empresa.id : 1,
    });

    res.status(201).json(gestion);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear gestión' });
  }
}

async function actualizar(req, res) {
  try {
    const gestion = await Gestion.findByPk(req.params.id);

    if (!gestion) {
      return res.status(404).json({ error: 'Gestión no encontrada' });
    }

    await gestion.update(req.body);
    res.json(gestion);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar gestión' });
  }
}

async function establecerActual(req, res) {
  try {
    const gestion = await Gestion.findByPk(req.params.id);

    if (!gestion) {
      return res.status(404).json({ error: 'Gestión no encontrada' });
    }

    const empresa = await Empresa.findOne();

    if (!empresa) {
      return res.status(404).json({ error: 'No hay empresa configurada' });
    }

    await empresa.update({ gestionActualId: gestion.id });

    res.json({ mensaje: 'Gestión actual actualizada', gestion });
  } catch (error) {
    res.status(500).json({ error: 'Error al establecer gestión actual' });
  }
}

async function eliminar(req, res) {
  try {
    const gestion = await Gestion.findByPk(req.params.id);

    if (!gestion) {
      return res.status(404).json({ error: 'Gestión no encontrada' });
    }

    const empresa = await Empresa.findOne();

    if (empresa && empresa.gestionActualId === gestion.id) {
      return res.status(400).json({
        error: 'No se puede eliminar la gestión actual',
      });
    }

    await gestion.destroy();
    res.json({ mensaje: 'Gestión eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar gestión' });
  }
}

module.exports = { listar, obtener, obtenerActual, crear, actualizar, establecerActual, eliminar };
