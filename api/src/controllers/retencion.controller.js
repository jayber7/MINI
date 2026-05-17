const { Retencion, Comprobante, ComprobanteDetalle, PlanCuenta, Empresa, CuentaEspecifica } = require('../models');
const { Op } = require('sequelize');

async function listar(req, res) {
  try {
    const { page = 1, limit = 20, desde, hasta, tipo } = req.query;
    const where = {};
    if (desde) where.fecha = { ...where.fecha, [Op.gte]: desde };
    if (hasta) where.fecha = { ...where.fecha, [Op.lte]: hasta };
    if (tipo) where.tipo = tipo;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await Retencion.findAndCountAll({
      where,
      include: [{ model: Comprobante, attributes: ['numero', 'glosa', 'estado'] }],
      order: [['fecha', 'DESC'], ['numero', 'DESC']],
      limit: parseInt(limit),
      offset,
    });

    res.json({
      retenciones: rows,
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / parseInt(limit)),
    });
  } catch (error) {
    console.error('Error listando retenciones:', error);
    res.status(500).json({ error: 'Error al listar retenciones' });
  }
}

async function obtener(req, res) {
  try {
    const retencion = await Retencion.findByPk(req.params.id, {
      include: [{ model: Comprobante, attributes: ['id', 'numero', 'glosa', 'estado', 'fecha'] }],
    });
    if (!retencion) return res.status(404).json({ error: 'Retención no encontrada' });
    res.json(retencion);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener retención' });
  }
}

async function crear(req, res) {
  try {
    const { fecha, glosa, numero, tipo, importe, incremento, debe, haber } = req.body;
    const empresa = await Empresa.findOne();
    const retencion = await Retencion.create({
      fecha, glosa, numero, tipo, importe, incremento, debe, haber,
      empresaId: empresa ? empresa.id : 1,
    });
    res.status(201).json(retencion);
  } catch (error) {
    console.error('Error creando retención:', error);
    res.status(500).json({ error: 'Error al crear retención' });
  }
}

async function actualizar(req, res) {
  try {
    const retencion = await Retencion.findByPk(req.params.id);
    if (!retencion) return res.status(404).json({ error: 'Retención no encontrada' });
    if (retencion.contabilizado) {
      return res.status(400).json({ error: 'No se puede editar una retención contabilizada' });
    }
    const { fecha, glosa, tipo, importe, incremento, debe, haber } = req.body;
    await retencion.update({ fecha, glosa, tipo, importe, incremento, debe, haber });
    res.json(retencion);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar retención' });
  }
}

async function eliminar(req, res) {
  try {
    const retencion = await Retencion.findByPk(req.params.id);
    if (!retencion) return res.status(404).json({ error: 'Retención no encontrada' });
    if (retencion.contabilizado) {
      return res.status(400).json({ error: 'No se puede eliminar una retención contabilizada' });
    }
    await retencion.destroy();
    res.json({ mensaje: 'Retención eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar retención' });
  }
}

async function contabilizar(req, res) {
  try {
    const retencion = await Retencion.findByPk(req.params.id, {
      include: [{ model: Comprobante }],
    });
    if (!retencion) return res.status(404).json({ error: 'Retención no encontrada' });
    if (retencion.contabilizado) return res.status(400).json({ error: 'Ya está contabilizada' });

    const tasa = retencion.tipo === 15 ? 0.155 : 0.08;
    const importeCalculado = retencion.incremento
      ? retencion.importe * tasa / (1 - tasa)
      : retencion.importe * tasa;

    const cuentaDebe = await PlanCuenta.findOne({ where: { codigo: retencion.debe } });
    const cuentaHaber = await PlanCuenta.findOne({ where: { codigo: retencion.haber } });

    if (!cuentaDebe || !cuentaHaber) {
      return res.status(400).json({ error: 'Cuentas contables no encontradas' });
    }

    const empresa = await Empresa.findOne();
    const ultimoComp = await Comprobante.findOne({ order: [['numero', 'DESC']] });
    const numero = ultimoComp ? ultimoComp.numero + 1 : 1;

    const comprobante = await Comprobante.create({
      numero,
      tipoComprobante: 'egreso',
      glosa: retencion.glosa || `Retención RC-IVA ${retencion.tipo === 15 ? '15.5' : '8'}% - Nº ${retencion.numero}`,
      fecha: retencion.fecha,
      estado: 'activo',
      empresaId: empresa ? empresa.id : 1,
      usuarioIdCrea: req.usuario.id,
    });

    await ComprobanteDetalle.bulkCreate([
      { comprobanteId: comprobante.id, planCuentaId: cuentaDebe.id, glosa: retencion.glosa, debe: parseFloat(importeCalculado.toFixed(2)), haber: 0 },
      { comprobanteId: comprobante.id, planCuentaId: cuentaHaber.id, glosa: retencion.glosa, debe: 0, haber: parseFloat(importeCalculado.toFixed(2)) },
    ]);

    await retencion.update({ contabilizado: true, comprobanteId: comprobante.id });

    const compCompleto = await Comprobante.findByPk(comprobante.id, {
      include: [{ model: ComprobanteDetalle, include: [{ model: PlanCuenta, attributes: ['codigo', 'nombre'] }] }],
    });

    res.json({ mensaje: 'Retención contabilizada correctamente', comprobante: compCompleto });
  } catch (error) {
    console.error('Error contabilizando retención:', error);
    res.status(500).json({ error: 'Error al contabilizar retención' });
  }
}

async function obtenerSiguienteNumero() {
  const ultimo = await Retencion.findOne({ order: [['numero', 'DESC']] });
  return ultimo ? ultimo.numero + 1 : 1;
}

module.exports = {
  listar, obtener, crear, actualizar, eliminar, contabilizar, obtenerSiguienteNumero,
};
