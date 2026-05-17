const { Compra, Comprobante, ComprobanteDetalle, PlanCuenta, Empresa, CuentaEspecifica } = require('../models');
const { Op } = require('sequelize');

async function listar(req, res) {
  try {
    const { page = 1, limit = 20, desde, hasta } = req.query;
    const where = {};
    if (desde) where.fecha = { ...where.fecha, [Op.gte]: desde };
    if (hasta) where.fecha = { ...where.fecha, [Op.lte]: hasta };

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await Compra.findAndCountAll({
      where,
      include: [{ model: Comprobante, attributes: ['numero', 'glosa', 'estado'] }],
      order: [['fecha', 'DESC']],
      limit: parseInt(limit),
      offset,
    });

    res.json({
      compras: rows,
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / parseInt(limit)),
    });
  } catch (error) {
    console.error('Error listando compras:', error);
    res.status(500).json({ error: 'Error al listar compras' });
  }
}

async function obtener(req, res) {
  try {
    const compra = await Compra.findByPk(req.params.id, {
      include: [{ model: Comprobante }],
    });
    if (!compra) return res.status(404).json({ error: 'Compra no encontrada' });
    res.json(compra);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener compra' });
  }
}

async function crear(req, res) {
  try {
    const empresa = await Empresa.findOne();
    const compra = await Compra.create({
      ...req.body,
      empresaId: empresa ? empresa.id : 1,
    });
    res.status(201).json(compra);
  } catch (error) {
    console.error('Error creando compra:', error);
    res.status(500).json({ error: 'Error al crear compra' });
  }
}

async function actualizar(req, res) {
  try {
    const compra = await Compra.findByPk(req.params.id);
    if (!compra) return res.status(404).json({ error: 'Compra no encontrada' });
    if (compra.contabilizado) return res.status(400).json({ error: 'No se puede editar una compra contabilizada' });
    await compra.update(req.body);
    res.json(compra);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar compra' });
  }
}

async function eliminar(req, res) {
  try {
    const compra = await Compra.findByPk(req.params.id);
    if (!compra) return res.status(404).json({ error: 'Compra no encontrada' });
    if (compra.contabilizado) return res.status(400).json({ error: 'No se puede eliminar una compra contabilizada' });
    await compra.destroy();
    res.json({ mensaje: 'Compra eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar compra' });
  }
}

async function contabilizar(req, res) {
  try {
    const compra = await Compra.findByPk(req.params.id);
    if (!compra) return res.status(404).json({ error: 'Compra no encontrada' });
    if (compra.contabilizado) return res.status(400).json({ error: 'Ya está contabilizada' });

    const empresa = await Empresa.findOne();
    if (empresa?.ivaExento) {
      return res.status(400).json({ error: 'La empresa está exenta de IVA' });
    }

    const importeTotal = parseFloat(compra.importeTotal);
    const descuentos = parseFloat(compra.descuentos) || 0;
    const importeNoSujeto = parseFloat(compra.importeNoSujeto) || 0;
    const baseImponible = importeTotal - descuentos - importeNoSujeto;
    const creditoFiscal = Math.round(baseImponible * 0.13 * 100) / 100;
    const neto = Math.round(baseImponible * 0.87 * 100) / 100;

    // Buscar cuentas
    const cuentaCreditoFiscal = await PlanCuenta.findOne({ where: { codigo: '1.1.5.1' } });
    const cuentaGasto = await PlanCuenta.findOne({ where: { codigo: '5.1.1' } });
    const cuentaPorPagar = await PlanCuenta.findOne({ where: { codigo: '2.1.1.1' } });

    if (!cuentaCreditoFiscal || !cuentaGasto || !cuentaPorPagar) {
      return res.status(400).json({ error: 'Cuentas contables no encontradas. Verifique el plan de cuentas.' });
    }

    const ultimoComp = await Comprobante.findOne({ order: [['numero', 'DESC']] });
    const numero = ultimoComp ? ultimoComp.numero + 1 : 1;

    const comprobante = await Comprobante.create({
      numero,
      tipoComprobante: 'egreso',
      glosa: compra.glosa || `Compra Nº ${compra.numeroCompra} - ${compra.razonSocial}`,
      fecha: compra.fecha,
      estado: 'activo',
      empresaId: empresa.id,
      usuarioIdCrea: req.usuario.id,
    });

    const detalles = [
      { comprobanteId: comprobante.id, planCuentaId: cuentaCreditoFiscal.id, glosa: 'Crédito Fiscal IVA 13%', debe: creditoFiscal, haber: 0 },
      { comprobanteId: comprobante.id, planCuentaId: cuentaGasto.id, glosa: 'Compra mercadería', debe: neto, haber: 0 },
      { comprobanteId: comprobante.id, planCuentaId: cuentaPorPagar.id, glosa: `Compra a ${compra.razonSocial}`, debe: 0, haber: importeTotal - descuentos },
    ];

    await ComprobanteDetalle.bulkCreate(detalles);
    await compra.update({ contabilizado: true, comprobanteId: comprobante.id });

    const compCompleto = await Comprobante.findByPk(comprobante.id, {
      include: [{ model: ComprobanteDetalle, include: [{ model: PlanCuenta, attributes: ['codigo', 'nombre'] }] }],
    });

    res.json({ mensaje: 'Compra contabilizada correctamente', comprobante: compCompleto });
  } catch (error) {
    console.error('Error contabilizando compra:', error);
    res.status(500).json({ error: 'Error al contabilizar compra' });
  }
}

module.exports = { listar, obtener, crear, actualizar, eliminar, contabilizar };
