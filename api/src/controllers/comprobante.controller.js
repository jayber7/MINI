const { Comprobante, ComprobanteDetalle, PlanCuenta, Gestion, Proyecto, Empresa, Usuario } = require('../models');
const { Op, Sequelize } = require('sequelize');

async function listar(req, res) {
  try {
    const { desde, hasta, tipo, estado, page = 1, limit = 20 } = req.query;

    const where = {};

    if (desde) where.fecha = { ...where.fecha, [Op.gte]: desde };
    if (hasta) where.fecha = { ...where.fecha, [Op.lte]: hasta };
    if (tipo) where.tipoComprobante = tipo;
    if (estado) where.estado = estado;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await Comprobante.findAndCountAll({
      where,
      include: [
        { model: Gestion, attributes: ['year'] },
        { model: Proyecto, attributes: ['nombre'] },
        { model: Usuario, as: 'usuarioCrea', attributes: ['nombreCompleto'] },
      ],
      order: [['fecha', 'DESC'], ['numero', 'DESC']],
      limit: parseInt(limit),
      offset,
    });

    res.json({
      comprobantes: rows,
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / parseInt(limit)),
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al listar comprobantes' });
  }
}

async function obtener(req, res) {
  try {
    const comprobante = await Comprobante.findByPk(req.params.id, {
      include: [
        {
          model: ComprobanteDetalle,
          include: [{ model: PlanCuenta, attributes: ['codigo', 'nombre', 'tipo'] }],
        },
        { model: Gestion, attributes: ['year', 'glosa'] },
        { model: Proyecto, attributes: ['nombre'] },
        { model: Usuario, as: 'usuarioCrea', attributes: ['nombreCompleto'] },
        { model: Usuario, as: 'usuarioAnula', attributes: ['nombreCompleto'] },
      ],
    });

    if (!comprobante) {
      return res.status(404).json({ error: 'Comprobante no encontrado' });
    }

    res.json(comprobante);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener comprobante' });
  }
}

async function crear(req, res) {
  try {
    const { numero, tipoComprobante, glosa, fecha, proyectoId, gestionId, detalles } = req.body;

    if (!detalles || detalles.length === 0) {
      return res.status(400).json({ error: 'El comprobante debe tener al menos una línea de detalle' });
    }

    let totalDebe = 0;
    let totalHaber = 0;

    detalles.forEach((d) => {
      totalDebe += parseFloat(d.debe) || 0;
      totalHaber += parseFloat(d.haber) || 0;
    });

    const diferencia = Math.abs(totalDebe - totalHaber);

    if (diferencia > 0.01) {
      return res.status(400).json({
        error: 'El comprobante no está balanceado',
        detalles: {
          totalDebe: totalDebe.toFixed(2),
          totalHaber: totalHaber.toFixed(2),
          diferencia: diferencia.toFixed(2),
        },
      });
    }

    const empresa = await Empresa.findOne();

    const comprobante = await Comprobante.create({
      numero: numero || (await obtenerSiguienteNumero(gestionId)),
      tipoComprobante,
      glosa,
      fecha,
      estado: 'activo',
      proyectoId: proyectoId || null,
      gestionId: gestionId || (await Gestion.findOne()).id,
      empresaId: empresa ? empresa.id : 1,
      usuarioIdCrea: req.usuario.id,
    });

    const detallesCreados = detalles.map((d) => ({
      comprobanteId: comprobante.id,
      planCuentaId: d.planCuentaId,
      glosa: d.glosa || null,
      debe: parseFloat(d.debe) || 0,
      haber: parseFloat(d.haber) || 0,
    }));

    await ComprobanteDetalle.bulkCreate(detallesCreados);

    const comprobanteCompleto = await Comprobante.findByPk(comprobante.id, {
      include: [
        {
          model: ComprobanteDetalle,
          include: [{ model: PlanCuenta, attributes: ['codigo', 'nombre', 'tipo'] }],
        },
      ],
    });

    res.status(201).json(comprobanteCompleto);
  } catch (error) {
    console.error('Error al crear comprobante:', error);
    res.status(500).json({ error: 'Error al crear comprobante' });
  }
}

async function actualizar(req, res) {
  try {
    const comprobante = await Comprobante.findByPk(req.params.id);

    if (!comprobante) {
      return res.status(404).json({ error: 'Comprobante no encontrado' });
    }

    if (comprobante.estado !== 'activo') {
      return res.status(400).json({
        error: 'Solo se pueden editar comprobantes con estado activo',
      });
    }

    const { glosa, fecha, tipoComprobante, proyectoId, detalles } = req.body;

    if (detalles && detalles.length > 0) {
      let totalDebe = 0;
      let totalHaber = 0;

      detalles.forEach((d) => {
        totalDebe += parseFloat(d.debe) || 0;
        totalHaber += parseFloat(d.haber) || 0;
      });

      const diferencia = Math.abs(totalDebe - totalHaber);

      if (diferencia > 0.01) {
        return res.status(400).json({
          error: 'El comprobante no está balanceado',
          detalles: {
            totalDebe: totalDebe.toFixed(2),
            totalHaber: totalHaber.toFixed(2),
            diferencia: diferencia.toFixed(2),
          },
        });
      }

      await ComprobanteDetalle.destroy({ where: { comprobanteId: comprobante.id } });

      const nuevosDetalles = detalles.map((d) => ({
        comprobanteId: comprobante.id,
        planCuentaId: d.planCuentaId,
        glosa: d.glosa || null,
        debe: parseFloat(d.debe) || 0,
        haber: parseFloat(d.haber) || 0,
      }));

      await ComprobanteDetalle.bulkCreate(nuevosDetalles);
    }

    await comprobante.update({
      glosa: glosa || comprobante.glosa,
      fecha: fecha || comprobante.fecha,
      tipoComprobante: tipoComprobante || comprobante.tipoComprobante,
      proyectoId: proyectoId !== undefined ? proyectoId : comprobante.proyectoId,
    });

    const comprobanteCompleto = await Comprobante.findByPk(comprobante.id, {
      include: [
        {
          model: ComprobanteDetalle,
          include: [{ model: PlanCuenta, attributes: ['codigo', 'nombre', 'tipo'] }],
        },
      ],
    });

    res.json(comprobanteCompleto);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar comprobante' });
  }
}

async function anular(req, res) {
  try {
    const comprobante = await Comprobante.findByPk(req.params.id);

    if (!comprobante) {
      return res.status(404).json({ error: 'Comprobante no encontrado' });
    }

    if (comprobante.estado === 'anulado') {
      return res.status(400).json({ error: 'El comprobante ya está anulado' });
    }

    await comprobante.update({
      estado: 'anulado',
      usuarioIdAnula: req.usuario.id,
      fechaAnulacion: new Date(),
    });

    res.json({ mensaje: 'Comprobante anulado correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al anular comprobante' });
  }
}

async function eliminar(req, res) {
  try {
    const comprobante = await Comprobante.findByPk(req.params.id);

    if (!comprobante) {
      return res.status(404).json({ error: 'Comprobante no encontrado' });
    }

    if (comprobante.estado !== 'activo') {
      return res.status(400).json({
        error: 'Solo se pueden eliminar comprobantes activos',
      });
    }

    await ComprobanteDetalle.destroy({ where: { comprobanteId: comprobante.id } });
    await comprobante.destroy();

    res.json({ mensaje: 'Comprobante eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar comprobante' });
  }
}

async function obtenerSiguienteNumero(gestionId) {
  const ultimo = await Comprobante.findOne({
    where: gestionId ? { gestionId } : {},
    order: [['numero', 'DESC']],
  });

  return ultimo ? ultimo.numero + 1 : 1;
}

async function obtenerTotales(req, res) {
  try {
    const { comprobanteId } = req.params;

    const totales = await ComprobanteDetalle.findOne({
      where: { comprobanteId },
      attributes: [
        [Sequelize.fn('SUM', Sequelize.col('debe')), 'totalDebe'],
        [Sequelize.fn('SUM', Sequelize.col('haber')), 'totalHaber'],
      ],
      raw: true,
    });

    res.json({
      totalDebe: parseFloat(totales.totalDebe) || 0,
      totalHaber: parseFloat(totales.totalHaber) || 0,
      balanceado: Math.abs((parseFloat(totales.totalDebe) || 0) - (parseFloat(totales.totalHaber) || 0)) < 0.01,
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener totales' });
  }
}

module.exports = {
  listar,
  obtener,
  crear,
  actualizar,
  anular,
  eliminar,
  obtenerTotales,
};
