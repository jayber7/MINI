const { Comprobante, ComprobanteDetalle, PlanCuenta, Gestion, Empresa } = require('../models');
const { Op } = require('sequelize');

async function flujoEfectivo(req, res) {
  try {
    const { desde, hasta, gestionId } = req.query;
    const empresaId = req.empresaId;

    let fechas = { desde, hasta };
    if (gestionId) {
      const gestion = await Gestion.findByPk(gestionId);
      if (gestion) {
        fechas = { desde: gestion.fechaInicio, hasta: gestion.fechaFin };
      }
    }

    const whereComprobante = { estado: 'activo', empresaId };
    if (fechas.desde || fechas.hasta) {
      whereComprobante.fecha = {};
      if (fechas.desde) whereComprobante.fecha[Op.gte] = fechas.desde;
      if (fechas.hasta) whereComprobante.fecha[Op.lte] = fechas.hasta;
    }

    const comprobantes = await Comprobante.findAll({
      where: whereComprobante,
      include: [{
        model: ComprobanteDetalle,
        include: [{ model: PlanCuenta, attributes: ['codigo', 'nombre', 'tipo', 'clasificacionFlujo'] }],
      }],
      order: [['fecha', 'ASC']],
    });

    const flujo = {
      operacion: { ingresos: 0, egresos: 0, neto: 0, items: [] },
      inversion: { ingresos: 0, egresos: 0, neto: 0, items: [] },
      financiamiento: { ingresos: 0, egresos: 0, neto: 0, items: [] },
      sinClasificar: { ingresos: 0, egresos: 0, neto: 0, items: [] },
      saldoInicial: 0,
      saldoFinal: 0,
    };

    // Calcular saldo inicial (efectivo antes del período)
    const cuentasEfectivo = await PlanCuenta.findAll({
      where: {
        empresaId,
        tipo: 'Activo',
        nombre: { [Op.like]: '%Caja%' },
      },
    });

    const codigosCaja = cuentasEfectivo.map(c => c.codigo);

    comprobantes.forEach(comp => {
      comp.ComprobanteDetalles.forEach(d => {
        const cuenta = d.PlanCuentum;
        if (!cuenta) return;

        const monto = (parseFloat(d.debe) || 0) - (parseFloat(d.haber) || 0);
        if (monto === 0) return;

        const clasif = cuenta.clasificacionFlujo || 'sinClasificar';
        const seccion = flujo[clasif];

        if (monto > 0) {
          seccion.ingresos += monto;
        } else {
          seccion.egresos += Math.abs(monto);
        }

        seccion.items.push({
          fecha: comp.fecha,
          numero: comp.numero,
          glosa: comp.glosa,
          cuenta: `${cuenta.codigo} - ${cuenta.nombre}`,
          tipo: monto > 0 ? 'ingreso' : 'egreso',
          monto: Math.abs(monto),
        });
      });
    });

    for (const key of ['operacion', 'inversion', 'financiamiento', 'sinClasificar']) {
      flujo[key].neto = flujo[key].ingresos - flujo[key].egresos;
    }

    flujo.saldoInicial = 0;
    flujo.saldoFinal = flujo.operacion.neto + flujo.inversion.neto + flujo.financiamiento.neto;

    res.json(flujo);
  } catch (error) {
    console.error('Error en Flujo de Efectivo:', error);
    res.status(500).json({ error: 'Error al generar Flujo de Efectivo' });
  }
}

module.exports = { flujoEfectivo };
