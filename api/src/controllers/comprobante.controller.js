const { Comprobante, ComprobanteDetalle, PlanCuenta, Gestion, Proyecto, Empresa, Usuario, ClienteProveedor } = require('../models');
const { Op, Sequelize } = require('sequelize');

async function listar(req, res) {
  try {
    const { desde, hasta, tipo, estado, documentoTipo, page = 1, limit = 20, search } = req.query;

    const where = { empresaId: req.empresaId };

    if (desde) where.fecha = { ...where.fecha, [Op.gte]: desde };
    if (hasta) where.fecha = { ...where.fecha, [Op.lte]: hasta };
    if (tipo) where.tipoComprobante = tipo;
    if (estado) where.estado = estado;
    if (documentoTipo) where.documentoTipo = documentoTipo;
    if (search) {
      where[Op.or] = [
        { glosa: { [Op.like]: `%${search}%` } },
        { documentoNumero: { [Op.like]: `%${search}%` } },
        { numero: isNaN(parseInt(search)) ? undefined : parseInt(search) },
      ].filter(Boolean);
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await Comprobante.findAndCountAll({
      where,
      include: [
        { model: Gestion, attributes: ['year'] },
        { model: Proyecto, attributes: ['nombre'] },
        { model: Usuario, as: 'usuarioCrea', attributes: ['nombreCompleto'] },
        { model: Usuario, as: 'vendedor', attributes: ['nombreCompleto'] },
        { model: ClienteProveedor, attributes: ['razonSocial', 'nit'] },
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
    console.error('Error al listar comprobantes:', error);
    res.status(500).json({ error: 'Error al listar comprobantes' });
  }
}

async function obtener(req, res) {
  try {
    const comprobante = await Comprobante.findOne({
      where: { id: req.params.id, empresaId: req.empresaId },
      include: [
        {
          model: ComprobanteDetalle,
          include: [{ model: PlanCuenta, attributes: ['codigo', 'nombre', 'tipo'] }],
        },
        { model: Gestion, attributes: ['year', 'glosa'] },
        { model: Proyecto, attributes: ['nombre'] },
        { model: Usuario, as: 'usuarioCrea', attributes: ['nombreCompleto'] },
        { model: Usuario, as: 'usuarioAnula', attributes: ['nombreCompleto'] },
        { model: Usuario, as: 'vendedor', attributes: ['nombreCompleto'] },
        { model: ClienteProveedor, attributes: ['razonSocial', 'nit', 'direccion'] },
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
    const { numero, tipoComprobante, documentoTipo, documentoNumero, glosa, fecha, proyectoId, gestionId, clienteProveedorId, vendedorId, pagado, fechaPago, subtotal, descuento, iva, cheque, usd, ufv, detalles } = req.body;

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

    const comprobante = await Comprobante.create({
      numero: numero || (await obtenerSiguienteNumero(gestionId)),
      tipoComprobante,
      documentoTipo: documentoTipo || null,
      documentoNumero: documentoNumero || null,
      glosa,
      fecha,
      estado: 'activo',
      pagado: pagado || false,
      fechaPago: fechaPago || null,
      subtotal: subtotal || null,
      descuento: descuento || 0,
      iva: iva || null,
      proyectoId: proyectoId || null,
      gestionId: gestionId || (await Gestion.findOne({ where: { empresaId: req.empresaId } })).id,
      empresaId: req.empresaId,
      usuarioIdCrea: req.usuario.id,
      vendedorId: vendedorId || null,
      clienteProveedorId: clienteProveedorId || null,
      cheque: cheque || null,
      usd: usd || null,
      ufv: ufv || null,
    });

    const detallesCreados = detalles.map((d) => ({
      comprobanteId: comprobante.id,
      planCuentaId: d.planCuentaId,
      glosa: d.glosa || null,
      debe: parseFloat(d.debe) || 0,
      haber: parseFloat(d.haber) || 0,
    }));

    await ComprobanteDetalle.bulkCreate(detallesCreados);

    const comprobanteCompleto = await Comprobante.findOne({
      where: { id: comprobante.id },
      include: [
        {
          model: ComprobanteDetalle,
          include: [{ model: PlanCuenta, attributes: ['codigo', 'nombre', 'tipo'] }],
        },
        { model: ClienteProveedor, attributes: ['razonSocial', 'nit'] },
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
    const comprobante = await Comprobante.findOne({
      where: { id: req.params.id, empresaId: req.empresaId },
    });

    if (!comprobante) {
      return res.status(404).json({ error: 'Comprobante no encontrado' });
    }

    if (comprobante.estado !== 'activo') {
      return res.status(400).json({
        error: 'Solo se pueden editar comprobantes con estado activo',
      });
    }

    const { glosa, fecha, tipoComprobante, documentoTipo, documentoNumero, proyectoId, clienteProveedorId, vendedorId, pagado, fechaPago, subtotal, descuento, iva, cheque, usd, ufv, detalles } = req.body;

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
      documentoTipo: documentoTipo !== undefined ? documentoTipo : comprobante.documentoTipo,
      documentoNumero: documentoNumero !== undefined ? documentoNumero : comprobante.documentoNumero,
      proyectoId: proyectoId !== undefined ? proyectoId : comprobante.proyectoId,
      clienteProveedorId: clienteProveedorId !== undefined ? clienteProveedorId : comprobante.clienteProveedorId,
      vendedorId: vendedorId !== undefined ? vendedorId : comprobante.vendedorId,
      pagado: pagado !== undefined ? pagado : comprobante.pagado,
      fechaPago: fechaPago !== undefined ? fechaPago : comprobante.fechaPago,
      subtotal: subtotal !== undefined ? subtotal : comprobante.subtotal,
      descuento: descuento !== undefined ? descuento : comprobante.descuento,
      iva: iva !== undefined ? iva : comprobante.iva,
      cheque: cheque !== undefined ? cheque : comprobante.cheque,
      usd: usd !== undefined ? usd : comprobante.usd,
      ufv: ufv !== undefined ? ufv : comprobante.ufv,
    });

    const comprobanteCompleto = await Comprobante.findOne({
      where: { id: comprobante.id },
      include: [
        {
          model: ComprobanteDetalle,
          include: [{ model: PlanCuenta, attributes: ['codigo', 'nombre', 'tipo'] }],
        },
        { model: ClienteProveedor, attributes: ['razonSocial', 'nit'] },
      ],
    });

    res.json(comprobanteCompleto);
  } catch (error) {
    console.error('Error al actualizar comprobante:', error);
    res.status(500).json({ error: 'Error al actualizar comprobante' });
  }
}

async function anular(req, res) {
  try {
    const comprobante = await Comprobante.findOne({
      where: { id: req.params.id, empresaId: req.empresaId },
    });

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

async function contabilizar(req, res) {
  try {
    const comprobante = await Comprobante.findOne({
      where: { id: req.params.id, empresaId: req.empresaId },
    });

    if (!comprobante) {
      return res.status(404).json({ error: 'Comprobante no encontrado' });
    }

    if (comprobante.estado !== 'activo') {
      return res.status(400).json({ error: 'Solo se pueden contabilizar comprobantes activos' });
    }

    await comprobante.update({
      estado: 'contabilizado',
      usuarioIdContabiliza: req.usuario.id,
      fechaContabilizacion: new Date(),
    });

    res.json({ mensaje: 'Comprobante contabilizado correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al contabilizar comprobante' });
  }
}

async function eliminar(req, res) {
  try {
    const comprobante = await Comprobante.findOne({
      where: { id: req.params.id, empresaId: req.empresaId },
    });

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

async function marcarPagado(req, res) {
  try {
    const comprobante = await Comprobante.findOne({
      where: { id: req.params.id, empresaId: req.empresaId },
    });

    if (!comprobante) {
      return res.status(404).json({ error: 'Comprobante no encontrado' });
    }

    const { pagado, fechaPago } = req.body;
    await comprobante.update({
      pagado: pagado !== undefined ? pagado : true,
      fechaPago: fechaPago || (pagado ? new Date() : null),
    });

    res.json({ mensaje: pagado ? 'Marcado como pagado' : 'Marcado como pendiente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar estado de pago' });
  }
}

async function kpis(req, res) {
  try {
    const { desde, hasta } = req.query;
    const where = { empresaId: req.empresaId };

    if (desde) where.fecha = { ...where.fecha, [Op.gte]: desde };
    if (hasta) where.fecha = { ...where.fecha, [Op.lte]: hasta };

    const total = await Comprobante.count({ where });

    const pagados = await Comprobante.count({ where: { ...where, pagado: true } });
    const pendientes = await Comprobante.count({ where: { ...where, pagado: false, estado: { [Op.ne]: 'anulado' } } });

    const totalMonto = await ComprobanteDetalle.findAll({
      include: [{
        model: Comprobante,
        where,
        attributes: [],
      }],
      attributes: [
        [Sequelize.fn('SUM', Sequelize.col('debe')), 'total'],
      ],
      raw: true,
    });

    res.json({
      total,
      pagados,
      pendientes,
      totalMonto: parseFloat(totalMonto[0]?.total) || 0,
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener KPIs' });
  }
}

module.exports = {
  listar,
  obtener,
  crear,
  actualizar,
  anular,
  contabilizar,
  eliminar,
  obtenerTotales,
  marcarPagado,
  kpis,
};
