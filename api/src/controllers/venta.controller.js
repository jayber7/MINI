const { Venta, Comprobante, ComprobanteDetalle, PlanCuenta, Empresa } = require('../models');
const { Op } = require('sequelize');

async function listar(req, res) {
  try {
    const { page = 1, limit = 20, desde, hasta } = req.query;
    const where = {};
    if (desde) where.fecha = { ...where.fecha, [Op.gte]: desde };
    if (hasta) where.fecha = { ...where.fecha, [Op.lte]: hasta };

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { count, rows } = await Venta.findAndCountAll({
      where,
      include: [{ model: Comprobante, attributes: ['numero', 'glosa', 'estado'] }],
      order: [['fecha', 'DESC']],
      limit: parseInt(limit),
      offset,
    });

    res.json({
      ventas: rows,
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / parseInt(limit)),
    });
  } catch (error) {
    console.error('Error listando ventas:', error);
    res.status(500).json({ error: 'Error al listar ventas' });
  }
}

async function obtener(req, res) {
  try {
    const venta = await Venta.findByPk(req.params.id, {
      include: [{ model: Comprobante }],
    });
    if (!venta) return res.status(404).json({ error: 'Venta no encontrada' });
    res.json(venta);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener venta' });
  }
}

async function crear(req, res) {
  try {
    const empresa = await Empresa.findOne();
    const venta = await Venta.create({
      ...req.body,
      empresaId: empresa ? empresa.id : 1,
    });
    res.status(201).json(venta);
  } catch (error) {
    console.error('Error creando venta:', error);
    res.status(500).json({ error: 'Error al crear venta' });
  }
}

async function actualizar(req, res) {
  try {
    const venta = await Venta.findByPk(req.params.id);
    if (!venta) return res.status(404).json({ error: 'Venta no encontrada' });
    if (venta.contabilizado) return res.status(400).json({ error: 'No se puede editar una venta contabilizada' });
    await venta.update(req.body);
    res.json(venta);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar venta' });
  }
}

async function eliminar(req, res) {
  try {
    const venta = await Venta.findByPk(req.params.id);
    if (!venta) return res.status(404).json({ error: 'Venta no encontrada' });
    if (venta.contabilizado) return res.status(400).json({ error: 'No se puede eliminar una venta contabilizada' });
    await venta.destroy();
    res.json({ mensaje: 'Venta eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar venta' });
  }
}

async function contabilizar(req, res) {
  try {
    const venta = await Venta.findByPk(req.params.id);
    if (!venta) return res.status(404).json({ error: 'Venta no encontrada' });
    if (venta.contabilizado) return res.status(400).json({ error: 'Ya está contabilizada' });

    const empresa = await Empresa.findOne();
    const ivaExento = empresa?.ivaExento || false;

    const importeTotal = parseFloat(venta.importeTotal);
    const descuentos = parseFloat(venta.descuentos) || 0;
    const importeExento = parseFloat(venta.importeExento) || 0;
    const baseImponible = importeTotal - descuentos - importeExento;

    const debitoFiscal = ivaExento ? 0 : Math.round(baseImponible * 0.13 * 100) / 100;
    const it = Math.round(baseImponible * 0.03 * 100) / 100;
    const neto = ivaExento ? importeTotal - descuentos : Math.round(baseImponible * 0.87 * 100) / 100;

    // Buscar cuentas
    const cuentaDebitoFiscal = await PlanCuenta.findOne({ where: { codigo: '2.1.3.1' } });
    const cuentaIT = await PlanCuenta.findOne({ where: { codigo: '2.1.3.2' } });
    const cuentaIngreso = await PlanCuenta.findOne({ where: { codigo: '4.1.1' } });
    const cuentaPorCobrar = await PlanCuenta.findOne({ where: { codigo: '1.1.4.1' } });

    if (!cuentaIngreso || !cuentaPorCobrar) {
      return res.status(400).json({ error: 'Cuentas contables no encontradas. Verifique el plan de cuentas.' });
    }

    const ultimoComp = await Comprobante.findOne({ order: [['numero', 'DESC']] });
    const numero = ultimoComp ? ultimoComp.numero + 1 : 1;

    const comprobante = await Comprobante.create({
      numero,
      tipoComprobante: 'ingreso',
      glosa: venta.glosa || `Venta Nº ${venta.numeroVenta} - ${venta.razonSocial || 'Cliente'}`,
      fecha: venta.fecha,
      estado: 'activo',
      empresaId: empresa.id,
      usuarioIdCrea: req.usuario.id,
    });

    const detalles = [
      { comprobanteId: comprobante.id, planCuentaId: cuentaPorCobrar.id, glosa: `Venta a ${venta.razonSocial || 'Cliente'}`, debe: importeTotal - descuentos, haber: 0 },
      { comprobanteId: comprobante.id, planCuentaId: cuentaIngreso.id, glosa: 'Ingreso por ventas', debe: 0, haber: neto },
    ];

    if (!ivaExento && cuentaDebitoFiscal) {
      detalles.push({ comprobanteId: comprobante.id, planCuentaId: cuentaDebitoFiscal.id, glosa: 'Débito Fiscal IVA 13%', debe: 0, haber: debitoFiscal });
    }

    if (cuentaIT) {
      detalles.push({ comprobanteId: comprobante.id, planCuentaId: cuentaIT.id, glosa: 'IT 3% por pagar', debe: 0, haber: it });
    }

    await ComprobanteDetalle.bulkCreate(detalles);
    await venta.update({ contabilizado: true, comprobanteId: comprobante.id });

    const compCompleto = await Comprobante.findByPk(comprobante.id, {
      include: [{ model: ComprobanteDetalle, include: [{ model: PlanCuenta, attributes: ['codigo', 'nombre'] }] }],
    });

    res.json({ mensaje: 'Venta contabilizada correctamente', comprobante: compCompleto });
  } catch (error) {
    console.error('Error contabilizando venta:', error);
    res.status(500).json({ error: 'Error al contabilizar venta' });
  }
}

module.exports = { listar, obtener, crear, actualizar, eliminar, contabilizar };
