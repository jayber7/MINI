const { Comprobante, ComprobanteDetalle, PlanCuenta, Gestion, Proyecto, Usuario, Empresa } = require('../models');
const { Op, Sequelize } = require('sequelize');

async function resolverFechas(desde, hasta, gestionId, empresaId) {
  if (gestionId) {
    const gestion = await Gestion.findByPk(gestionId);
    if (gestion) {
      return { desde: gestion.fechaInicio, hasta: gestion.fechaFin };
    }
  }
  return { desde, hasta };
}

function aplicarRollUp(cuentas, campoSaldo = 'saldo') {
  const mapa = {};
  cuentas.forEach((c) => {
    mapa[c.codigo] = { ...c, _saldoOriginal: c[campoSaldo] || 0, hijos: [] };
  });

  const raices = [];
  const codigos = Object.keys(mapa).sort();

  codigos.forEach((codigo) => {
    const partes = codigo.split('.');
    // Para formato 10 dígitos, usar primeros 2 caracteres como nivel
    const esFormato10Digitos = /^\d{10}$/.test(codigo);
    if (esFormato10Digitos) {
      if (codigo.endsWith('000000000')) {
        raices.push(mapa[codigo]);
        return;
      }
      // Encontrar padre: quitar últimos 2 dígitos no cero, luego rellenar con ceros
      let codigoPadre = codigo;
      while (codigoPadre.length > 2 && codigoPadre.endsWith('0')) {
        codigoPadre = codigoPadre.slice(0, -1);
      }
      if (codigoPadre.length < 10) {
        codigoPadre = codigoPadre.padEnd(10, '0');
      }
      if (mapa[codigoPadre]) {
        mapa[codigoPadre].hijos.push(mapa[codigo]);
      } else {
        raices.push(mapa[codigo]);
      }
      return;
    }

    if (partes.length <= 1) {
      raices.push(mapa[codigo]);
      return;
    }
    const partesPadre = partes.slice(0, -1);
    const codigoPadre = partesPadre.join('.');
    if (mapa[codigoPadre]) {
      mapa[codigoPadre].hijos.push(mapa[codigo]);
    } else {
      raices.push(mapa[codigo]);
    }
  });

  function acumular(nodo) {
    if (!nodo.hijos || nodo.hijos.length === 0) {
      return nodo._saldoOriginal || 0;
    }
    let suma = 0;
    nodo.hijos.forEach((hijo) => {
      suma += acumular(hijo);
    });
    nodo[campoSaldo] = nodo._saldoOriginal + suma;
    return nodo[campoSaldo];
  }

  raices.forEach((r) => acumular(r));

  function aplanar(nodo, lista = []) {
    const { hijos, ...resto } = nodo;
    lista.push(resto);
    if (hijos) {
      hijos.forEach((h) => aplanar(h, lista));
    }
    return lista;
  }

  const resultado = [];
  raices.forEach((r) => aplanar(r, resultado));
  return resultado;
}

async function obtenerLibroDiario(desde, hasta, proyecto, empresaId) {
  const where = { estado: 'activo', empresaId };

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
        cuentaCodigo: d.PlanCuentum?.codigo || '',
        cuentaNombre: d.PlanCuentum?.nombre || '',
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
    const { desde, hasta, proyecto, gestionId } = req.query;
    const fechas = await resolverFechas(desde, hasta, gestionId);
    const resultado = await obtenerLibroDiario(fechas.desde, fechas.hasta, proyecto, req.empresaId);
    res.json(resultado);
  } catch (error) {
    console.error('Error en Libro Diario:', error);
    res.status(500).json({ error: 'Error al generar Libro Diario' });
  }
}

async function obtenerLibroMayor(desde, hasta, codigoCuenta, empresaId) {
  const whereComprobante = { estado: 'activo', empresaId };

  if (desde || hasta) {
    whereComprobante.fecha = {};
    if (desde) whereComprobante.fecha[Op.gte] = desde;
    if (hasta) whereComprobante.fecha[Op.lte] = hasta;
  }

  const comprobantes = await Comprobante.findAll({
    where: whereComprobante,
    include: [
      {
        model: ComprobanteDetalle,
        include: [{ model: PlanCuenta, attributes: ['codigo', 'nombre', 'tipo'] }],
      },
    ],
    order: [['fecha', 'ASC'], ['numero', 'ASC']],
  });

  const cuentasMap = {};

  comprobantes.forEach((comp) => {
    comp.ComprobanteDetalles.forEach((d) => {
      const codigo = d.PlanCuentum?.codigo;
      if (!codigo) return;

      if (codigoCuenta && codigo !== codigoCuenta) return;

      if (!cuentasMap[codigo]) {
        cuentasMap[codigo] = {
          codigo,
          nombre: d.PlanCuentum.nombre,
          tipo: d.PlanCuentum.tipo,
          movimientos: [],
          totalDebe: 0,
          totalHaber: 0,
          saldo: 0,
        };
      }

      const debe = parseFloat(d.debe) || 0;
      const haber = parseFloat(d.haber) || 0;

      cuentasMap[codigo].movimientos.push({
        fecha: comp.fecha,
        numero: comp.numero,
        glosa: d.glosa || comp.glosa,
        tipoComprobante: comp.tipoComprobante,
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
  });

  return Object.values(cuentasMap).sort((a, b) => a.codigo.localeCompare(b.codigo));
}

async function libroMayor(req, res) {
  try {
    const { desde, hasta, codigoCuenta, gestionId } = req.query;
    const fechas = await resolverFechas(desde, hasta, gestionId);
    const resultado = await obtenerLibroMayor(fechas.desde, fechas.hasta, codigoCuenta, req.empresaId);
    res.json(resultado);
  } catch (error) {
    console.error('Error en Libro Mayor:', error);
    res.status(500).json({ error: 'Error al generar Libro Mayor' });
  }
}

async function obtenerBalanceGeneral(desde, hasta, empresaId) {
  const where = { estado: 'activo', empresaId };
  if (desde || hasta) {
    where.fecha = {};
    if (desde) where.fecha[Op.gte] = desde;
    if (hasta) where.fecha[Op.lte] = hasta;
  }

  const cuentas = await PlanCuenta.findAll({
    where: { empresaId },
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

  const cuentasConSaldo = [];

  cuentas.forEach((cuenta) => {
    let debeTotal = 0;
    let haberTotal = 0;

    cuenta.ComprobanteDetalles.forEach((d) => {
      debeTotal += parseFloat(d.debe) || 0;
      haberTotal += parseFloat(d.haber) || 0;
    });

    const saldo = cuenta.tipo === 'Activo'
      ? debeTotal - haberTotal
      : haberTotal - debeTotal;

    const item = {
      codigo: cuenta.codigo,
      nombre: cuenta.nombre,
      nivel: cuenta.nivel,
      tipo: cuenta.tipo,
      saldo,
      debeTotal,
      haberTotal,
    };

    if (cuenta.tipo === 'Activo' || cuenta.tipo === 'Pasivo' || cuenta.tipo === 'Patrimonio') {
      cuentasConSaldo.push(item);
    }
  });

  const activoRaw = cuentasConSaldo.filter((c) => c.tipo === 'Activo');
  const pasivoRaw = cuentasConSaldo.filter((c) => c.tipo === 'Pasivo');
  const patrimonioRaw = cuentasConSaldo.filter((c) => c.tipo === 'Patrimonio');

  resultado.activo.cuentas = aplicarRollUp(activoRaw, 'saldo');
  resultado.pasivo.cuentas = aplicarRollUp(pasivoRaw, 'saldo');
  resultado.patrimonio.cuentas = aplicarRollUp(patrimonioRaw, 'saldo');

  resultado.activo.cuentas.forEach((c) => { if (c.nivel === 1) resultado.activo.total += c.saldo; });
  resultado.pasivo.cuentas.forEach((c) => { if (c.nivel === 1) resultado.pasivo.total += c.saldo; });
  resultado.patrimonio.cuentas.forEach((c) => { if (c.nivel === 1) resultado.patrimonio.total += c.saldo; });

  resultado.utilidadEjercicio = await calcularUtilidad(desde, hasta, empresaId);
  resultado.patrimonio.total += resultado.utilidadEjercicio;

  return resultado;
}

async function balanceGeneral(req, res) {
  try {
    const { desde, hasta, gestionId } = req.query;
    const fechas = await resolverFechas(desde, hasta, gestionId);
    const resultado = await obtenerBalanceGeneral(fechas.desde, fechas.hasta, req.empresaId);
    res.json(resultado);
  } catch (error) {
    console.error('Error en Balance General:', error);
    res.status(500).json({ error: 'Error al generar Balance General' });
  }
}

async function obtenerEstadoResultados(desde, hasta, empresaId) {
  const ingresos = await calcularPorTipo('Ingreso', desde, hasta, empresaId);
  const gastos = await calcularPorTipo('Gasto', desde, hasta, empresaId);

  const totalIngresos = ingresos.reduce((sum, c) => sum + c.saldo, 0);
  const totalGastos = gastos.reduce((sum, c) => sum + c.saldo, 0);

  const utilidadAntesIUE = totalIngresos - totalGastos;
  const iue = utilidadAntesIUE > 0 ? utilidadAntesIUE * 0.25 : 0;
  const utilidadNeta = utilidadAntesIUE > 0 ? utilidadAntesIUE - iue : utilidadAntesIUE;

  return {
    ingresos: { total: totalIngresos, cuentas: ingresos },
    gastos: { total: totalGastos, cuentas: gastos },
    utilidad: utilidadAntesIUE,
    iue,
    utilidadNeta,
  };
}

async function estadoResultados(req, res) {
  try {
    const { desde, hasta, gestionId } = req.query;
    const fechas = await resolverFechas(desde, hasta, gestionId);
    const resultado = await obtenerEstadoResultados(fechas.desde, fechas.hasta, req.empresaId);
    res.json(resultado);
  } catch (error) {
    console.error('Error en Estado de Resultados:', error);
    res.status(500).json({ error: 'Error al generar Estado de Resultados' });
  }
}

async function obtenerEvolucionPatrimonio(desde, hasta, empresaId) {
  const patrimonio = await calcularPorTipo('Patrimonio', desde, hasta, empresaId);
  const totalPatrimonio = patrimonio.reduce((sum, c) => sum + c.saldo, 0);

  const utilidad = await calcularUtilidad(desde, hasta, empresaId);

  // Mapeo específico para Estado de Patrimonio
  const itemCapital = patrimonio.find(c =>
    c.nombre.toLowerCase().includes('capital social') ||
    c.codigo.startsWith('3.1') || c.codigo.startsWith('30101')
  );
  const itemAjusteCapital = patrimonio.find(c =>
    c.nombre.toLowerCase().includes('ajuste de capital') ||
    c.codigo.startsWith('3010202')
  );
  const itemReservaLegal = patrimonio.find(c =>
    c.nombre.toLowerCase().includes('reserva legal') ||
    c.codigo.startsWith('3.2.1')
  );
  const itemAjusteReservas = patrimonio.find(c =>
    c.nombre.toLowerCase().includes('ajuste de reservas')
  );
  const itemResultadosAcum = patrimonio.find(c =>
    c.nombre.toLowerCase().includes('resultados acumulados') ||
    c.codigo.startsWith('3.2.2') || c.codigo.startsWith('3010301')
  );

  return {
    patrimonioInicial: totalPatrimonio,
    utilidad: utilidad,
    patrimonioFinal: totalPatrimonio + utilidad,
    detalle: patrimonio,
    items: [
      { nombre: 'Capital Social', saldo: itemCapital?.saldo || 0 },
      { nombre: 'Ajuste de Capital', saldo: itemAjusteCapital?.saldo || 0 },
      { nombre: 'Reserva Legal', saldo: itemReservaLegal?.saldo || 0 },
      { nombre: 'Ajuste de Reservas Patrimoniales', saldo: itemAjusteReservas?.saldo || 0 },
      { nombre: 'Resultados Acumulados', saldo: itemResultadosAcum?.saldo || 0 },
    ],
  };
}

async function evolucionPatrimonio(req, res) {
  try {
    const { desde, hasta, gestionId } = req.query;
    const fechas = await resolverFechas(desde, hasta, gestionId);
    const resultado = await obtenerEvolucionPatrimonio(fechas.desde, fechas.hasta, req.empresaId);
    res.json(resultado);
  } catch (error) {
    console.error('Error en Evolución del Patrimonio:', error);
    res.status(500).json({ error: 'Error al generar Evolución del Patrimonio' });
  }
}

async function obtenerSumasSaldos(desde, hasta, empresaId) {
  const where = { estado: 'activo', empresaId };
  if (desde || hasta) {
    where.fecha = {};
    if (desde) where.fecha[Op.gte] = desde;
    if (hasta) where.fecha[Op.lte] = hasta;
  }

  const cuentas = await PlanCuenta.findAll({
    where: { empresaId },
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

  const cuentasConSaldos = cuentas
    .map((cuenta) => {
      let sumaDebe = 0;
      let sumaHaber = 0;

      cuenta.ComprobanteDetalles.forEach((d) => {
        sumaDebe += parseFloat(d.debe) || 0;
        sumaHaber += parseFloat(d.haber) || 0;
      });

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
    });

  const conRollUp = aplicarRollUp(cuentasConSaldos, 'saldoDeudor');

  let totalSumaDebe = 0;
  let totalSumaHaber = 0;
  let totalSaldoDeudor = 0;
  let totalSaldoAcreedor = 0;

  conRollUp.forEach((c) => {
    totalSumaDebe += c.sumaDebe || 0;
    totalSumaHaber += c.sumaHaber || 0;
    totalSaldoDeudor += c.saldoDeudor || 0;
    totalSaldoAcreedor += c.saldoAcreedor || 0;
  });

  return {
    cuentas: conRollUp,
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
    const { desde, hasta, gestionId } = req.query;
    const fechas = await resolverFechas(desde, hasta, gestionId);
    const resultado = await obtenerSumasSaldos(fechas.desde, fechas.hasta, req.empresaId);
    res.json(resultado);
  } catch (error) {
    console.error('Error en Sumas y Saldos:', error);
    res.status(500).json({ error: 'Error al generar Sumas y Saldos' });
  }
}

async function calcularPorTipo(tipo, desde, hasta, empresaId) {
  const where = { estado: 'activo', empresaId };
  if (desde || hasta) {
    where.fecha = {};
    if (desde) where.fecha[Op.gte] = desde;
    if (hasta) where.fecha[Op.lte] = hasta;
  }

  const cuentas = await PlanCuenta.findAll({
    where: { tipo, empresaId },
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

  const cuentasConSaldo = cuentas
    .map((cuenta) => {
      let debeTotal = 0;
      let haberTotal = 0;

      cuenta.ComprobanteDetalles.forEach((d) => {
        debeTotal += parseFloat(d.debe) || 0;
        haberTotal += parseFloat(d.haber) || 0;
      });

      const saldo = tipo === 'Ingreso' ? haberTotal - debeTotal : debeTotal - haberTotal;

      return {
        codigo: cuenta.codigo,
        nombre: cuenta.nombre,
        nivel: cuenta.nivel,
        tipo: cuenta.tipo,
        saldo,
      };
    });

  return aplicarRollUp(cuentasConSaldo, 'saldo');
}

async function calcularUtilidad(desde, hasta, empresaId) {
  const ingresos = await calcularPorTipo('Ingreso', desde, hasta, empresaId);
  const gastos = await calcularPorTipo('Gasto', desde, hasta, empresaId);

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
