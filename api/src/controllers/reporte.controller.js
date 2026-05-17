const { Comprobante, ComprobanteDetalle, PlanCuenta, Gestion, Proyecto, Usuario, Empresa } = require('../models');
const { Op, Sequelize } = require('sequelize');

async function obtenerLibroDiario(desde, hasta, proyecto) {
  const where = { estado: 'activo' };

  if (desde || hasta) {
    where.fecha = {};
    if (desde) where.fecha[Op.gte] = desde;
    if (hasta) where.fecha[Op.lte] = hasta;
  }

  if (proyecto) {
    where.proyectoId = proyecto;
  }

  const comprobantes = await Comprobante.findAll({
    where,
    include: [
      {
        model: ComprobanteDetalle,
        include: [{ model: PlanCuenta, attributes: ['codigo', 'nombre', 'tipo'] }],
      },
      { model: Proyecto, attributes: ['nombre'] },
    ],
    order: [['fecha', 'ASC'], ['numero', 'ASC']],
  });

  return comprobantes.map((comp) => {
    let totalDebe = 0;
    let totalHaber = 0;

    const detalles = comp.ComprobanteDetalles.map((d) => {
      totalDebe += parseFloat(d.debe) || 0;
      totalHaber += parseFloat(d.haber) || 0;
      return {
        id: d.id,
        cuentaCodigo: d.PlanCuenta?.codigo || '',
        cuentaNombre: d.PlanCuenta?.nombre || '',
        glosa: d.glosa,
        debe: parseFloat(d.debe),
        haber: parseFloat(d.haber),
      };
    });

    return {
      id: comp.id,
      numero: comp.numero,
      fecha: comp.fecha,
      tipoComprobante: comp.tipoComprobante,
      glosa: comp.glosa,
      proyecto: comp.Proyecto?.nombre || null,
      detalles,
      totalDebe,
      totalHaber,
    };
  });
}

async function libroDiario(req, res) {
  try {
    const { desde, hasta, proyecto } = req.query;
    const resultado = await obtenerLibroDiario(desde, hasta, proyecto);
    res.json(resultado);
  } catch (error) {
    console.error('Error en Libro Diario:', error);
    res.status(500).json({ error: 'Error al generar Libro Diario' });
  }
}

async function obtenerLibroMayor(desde, hasta, codigoCuenta) {
  const whereDetalle = {};

  if (codigoCuenta) {
    const cuenta = await PlanCuenta.findOne({ where: { codigo: codigoCuenta } });
    if (cuenta) {
      whereDetalle.planCuentaId = cuenta.id;
    }
  }

  const whereComprobante = { estado: 'activo' };

  if (desde || hasta) {
    whereComprobante.fecha = {};
    if (desde) whereComprobante.fecha[Op.gte] = desde;
    if (hasta) whereComprobante.fecha[Op.lte] = hasta;
  }

  const detalles = await ComprobanteDetalle.findAll({
    where: whereDetalle,
    include: [
      { model: PlanCuenta, attributes: ['codigo', 'nombre', 'tipo'] },
      {
        model: Comprobante,
        where: whereComprobante,
        attributes: ['id', 'numero', 'fecha', 'glosa', 'tipoComprobante'],
      },
    ],
    order: [[Comprobante, 'fecha', 'ASC'], [Comprobante, 'numero', 'ASC']],
  });

  const cuentasMap = {};

  detalles.forEach((d) => {
    const codigo = d.PlanCuenta?.codigo;
    if (!codigo) return;

    if (!cuentasMap[codigo]) {
      cuentasMap[codigo] = {
        codigo,
        nombre: d.PlanCuenta.nombre,
        tipo: d.PlanCuenta.tipo,
        movimientos: [],
        totalDebe: 0,
        totalHaber: 0,
        saldo: 0,
      };
    }

    const debe = parseFloat(d.debe) || 0;
    const haber = parseFloat(d.haber) || 0;

    cuentasMap[codigo].movimientos.push({
      fecha: d.Comprobante?.fecha,
      numero: d.Comprobante?.numero,
      glosa: d.glosa || d.Comprobante?.glosa,
      tipoComprobante: d.Comprobante?.tipoComprobante,
      debe,
      haber,
    });

    cuentasMap[codigo].totalDebe += debe;
    cuentasMap[codigo].totalHaber += haber;

    if (cuentasMap[codigo].tipo === 'Activo' || cuentasMap[codigo].tipo === 'Gasto') {
      cuentasMap[codigo].saldo += debe - haber;
    } else {
      cuentasMap[codigo].saldo += haber - debe;
    }
  });

  return Object.values(cuentasMap).sort((a, b) => a.codigo.localeCompare(b.codigo));
}

async function libroMayor(req, res) {
  try {
    const { desde, hasta, codigoCuenta } = req.query;
    const resultado = await obtenerLibroMayor(desde, hasta, codigoCuenta);
    res.json(resultado);
  } catch (error) {
    console.error('Error en Libro Mayor:', error);
    res.status(500).json({ error: 'Error al generar Libro Mayor' });
  }
}

async function obtenerBalanceGeneral(desde, hasta) {
  const where = { estado: 'activo' };
  if (desde || hasta) {
    where.fecha = {};
    if (desde) where.fecha[Op.gte] = desde;
    if (hasta) where.fecha[Op.lte] = hasta;
  }

  const cuentas = await PlanCuenta.findAll({
    include: [
      {
        model: ComprobanteDetalle,
        include: [
          {
            model: Comprobante,
            where,
            attributes: [],
          },
        ],
        attributes: ['debe', 'haber'],
      },
    ],
  });

  const resultado = {
    activo: { total: 0, cuentas: [] },
    pasivo: { total: 0, cuentas: [] },
    patrimonio: { total: 0, cuentas: [] },
    utilidadEjercicio: 0,
  };

  cuentas.forEach((cuenta) => {
    let debeTotal = 0;
    let haberTotal = 0;

    cuenta.ComprobanteDetalles.forEach((d) => {
      debeTotal += parseFloat(d.debe) || 0;
      haberTotal += parseFloat(d.haber) || 0;
    });

    if (debeTotal === 0 && haberTotal === 0) return;

    const saldo = cuenta.tipo === 'Activo'
      ? debeTotal - haberTotal
      : haberTotal - debeTotal;

    if (saldo === 0) return;

    const item = {
      codigo: cuenta.codigo,
      nombre: cuenta.nombre,
      nivel: cuenta.nivel,
      saldo,
    };

    if (cuenta.tipo === 'Activo') {
      resultado.activo.cuentas.push(item);
      resultado.activo.total += saldo;
    } else if (cuenta.tipo === 'Pasivo') {
      resultado.pasivo.cuentas.push(item);
      resultado.pasivo.total += saldo;
    } else if (cuenta.tipo === 'Patrimonio') {
      resultado.patrimonio.cuentas.push(item);
      resultado.patrimonio.total += saldo;
    }
  });

  resultado.utilidadEjercicio = await calcularUtilidad(desde, hasta);
  resultado.patrimonio.total += resultado.utilidadEjercicio;

  return resultado;
}

async function balanceGeneral(req, res) {
  try {
    const { desde, hasta } = req.query;
    const resultado = await obtenerBalanceGeneral(desde, hasta);
    res.json(resultado);
  } catch (error) {
    console.error('Error en Balance General:', error);
    res.status(500).json({ error: 'Error al generar Balance General' });
  }
}

async function obtenerEstadoResultados(desde, hasta) {
  const ingresos = await calcularPorTipo('Ingreso', desde, hasta);
  const gastos = await calcularPorTipo('Gasto', desde, hasta);

  const totalIngresos = ingresos.reduce((sum, c) => sum + c.saldo, 0);
  const totalGastos = gastos.reduce((sum, c) => sum + c.saldo, 0);

  return {
    ingresos: { total: totalIngresos, cuentas: ingresos },
    gastos: { total: totalGastos, cuentas: gastos },
    utilidad: totalIngresos - totalGastos,
  };
}

async function estadoResultados(req, res) {
  try {
    const { desde, hasta } = req.query;
    const resultado = await obtenerEstadoResultados(desde, hasta);
    res.json(resultado);
  } catch (error) {
    console.error('Error en Estado de Resultados:', error);
    res.status(500).json({ error: 'Error al generar Estado de Resultados' });
  }
}

async function obtenerEvolucionPatrimonio(desde, hasta) {
  const patrimonio = await calcularPorTipo('Patrimonio', desde, hasta);
  const totalPatrimonio = patrimonio.reduce((sum, c) => sum + c.saldo, 0);

  const utilidad = await calcularUtilidad(desde, hasta);

  return {
    patrimonioInicial: totalPatrimonio,
    utilidad: utilidad,
    patrimonioFinal: totalPatrimonio + utilidad,
    detalle: patrimonio,
  };
}

async function evolucionPatrimonio(req, res) {
  try {
    const { desde, hasta } = req.query;
    const resultado = await obtenerEvolucionPatrimonio(desde, hasta);
    res.json(resultado);
  } catch (error) {
    console.error('Error en Evolución del Patrimonio:', error);
    res.status(500).json({ error: 'Error al generar Evolución del Patrimonio' });
  }
}

async function obtenerSumasSaldos(desde, hasta) {
  const where = { estado: 'activo' };
  if (desde || hasta) {
    where.fecha = {};
    if (desde) where.fecha[Op.gte] = desde;
    if (hasta) where.fecha[Op.lte] = hasta;
  }

  const cuentas = await PlanCuenta.findAll({
    include: [
      {
        model: ComprobanteDetalle,
        include: [
          {
            model: Comprobante,
            where,
            attributes: [],
          },
        ],
        attributes: ['debe', 'haber'],
      },
    ],
    order: [['codigo', 'ASC']],
  });

  let totalSumaDebe = 0;
  let totalSumaHaber = 0;
  let totalSaldoDeudor = 0;
  let totalSaldoAcreedor = 0;

  const resultado = cuentas
    .map((cuenta) => {
      let sumaDebe = 0;
      let sumaHaber = 0;

      cuenta.ComprobanteDetalles.forEach((d) => {
        sumaDebe += parseFloat(d.debe) || 0;
        sumaHaber += parseFloat(d.haber) || 0;
      });

      if (sumaDebe === 0 && sumaHaber === 0) return null;

      let saldoDeudor = 0;
      let saldoAcreedor = 0;

      if (cuenta.tipo === 'Activo' || cuenta.tipo === 'Gasto') {
        saldoDeudor = sumaDebe - sumaHaber;
        if (saldoDeudor < 0) {
          saldoAcreedor = Math.abs(saldoDeudor);
          saldoDeudor = 0;
        }
      } else {
        saldoAcreedor = sumaHaber - sumaDebe;
        if (saldoAcreedor < 0) {
          saldoDeudor = Math.abs(saldoAcreedor);
          saldoAcreedor = 0;
        }
      }

      totalSumaDebe += sumaDebe;
      totalSumaHaber += sumaHaber;
      totalSaldoDeudor += saldoDeudor;
      totalSaldoAcreedor += saldoAcreedor;

      return {
        codigo: cuenta.codigo,
        nombre: cuenta.nombre,
        nivel: cuenta.nivel,
        tipo: cuenta.tipo,
        sumaDebe,
        sumaHaber,
        saldoDeudor,
        saldoAcreedor,
      };
    })
    .filter(Boolean);

  return {
    cuentas: resultado,
    totales: {
      sumaDebe: totalSumaDebe,
      sumaHaber: totalSumaHaber,
      saldoDeudor: totalSaldoDeudor,
      saldoAcreedor: totalSaldoAcreedor,
    },
  };
}

async function sumasSaldos(req, res) {
  try {
    const { desde, hasta } = req.query;
    const resultado = await obtenerSumasSaldos(desde, hasta);
    res.json(resultado);
  } catch (error) {
    console.error('Error en Sumas y Saldos:', error);
    res.status(500).json({ error: 'Error al generar Sumas y Saldos' });
  }
}

async function calcularPorTipo(tipo, desde, hasta) {
  const where = { estado: 'activo' };
  if (desde || hasta) {
    where.fecha = {};
    if (desde) where.fecha[Op.gte] = desde;
    if (hasta) where.fecha[Op.lte] = hasta;
  }

  const cuentas = await PlanCuenta.findAll({
    where: { tipo },
    include: [
      {
        model: ComprobanteDetalle,
        include: [
          {
            model: Comprobante,
            where,
            attributes: [],
          },
        ],
        attributes: ['debe', 'haber'],
      },
    ],
    order: [['codigo', 'ASC']],
  });

  return cuentas
    .map((cuenta) => {
      let debeTotal = 0;
      let haberTotal = 0;

      cuenta.ComprobanteDetalles.forEach((d) => {
        debeTotal += parseFloat(d.debe) || 0;
        haberTotal += parseFloat(d.haber) || 0;
      });

      if (debeTotal === 0 && haberTotal === 0) return null;

      const saldo = tipo === 'Ingreso' ? haberTotal - debeTotal : debeTotal - haberTotal;

      if (saldo === 0) return null;

      return {
        codigo: cuenta.codigo,
        nombre: cuenta.nombre,
        nivel: cuenta.nivel,
        saldo,
      };
    })
    .filter(Boolean);
}

async function calcularUtilidad(desde, hasta) {
  const ingresos = await calcularPorTipo('Ingreso', desde, hasta);
  const gastos = await calcularPorTipo('Gasto', desde, hasta);

  const totalIngresos = ingresos.reduce((sum, c) => sum + c.saldo, 0);
  const totalGastos = gastos.reduce((sum, c) => sum + c.saldo, 0);

  return totalIngresos - totalGastos;
}

module.exports = {
  libroDiario,
  libroMayor,
  balanceGeneral,
  estadoResultados,
  evolucionPatrimonio,
  sumasSaldos,
  obtenerLibroDiario,
  obtenerLibroMayor,
  obtenerBalanceGeneral,
  obtenerEstadoResultados,
  obtenerEvolucionPatrimonio,
  obtenerSumasSaldos,
};
