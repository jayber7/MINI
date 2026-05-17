const { PlanCuenta, Empresa } = require('../models');
const { Op } = require('sequelize');

async function listar(req, res) {
  try {
    const cuentas = await PlanCuenta.findAll({
      order: [['codigo', 'ASC']],
    });
    res.json(cuentas);
  } catch (error) {
    res.status(500).json({ error: 'Error al listar plan de cuentas' });
  }
}

async function obtener(req, res) {
  try {
    const cuenta = await PlanCuenta.findByPk(req.params.id, {
      include: [
        { model: PlanCuenta, as: 'hijos', order: [['codigo', 'ASC']] },
      ],
    });

    if (!cuenta) {
      return res.status(404).json({ error: 'Cuenta no encontrada' });
    }

    res.json(cuenta);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener cuenta' });
  }
}

async function crear(req, res) {
  try {
    const { codigo, nombre, nivel, padreId, tipo, clase, codigoSiat, cuentaSiat } = req.body;

    const cuentaExistente = await PlanCuenta.findOne({ where: { codigo } });

    if (cuentaExistente) {
      return res.status(409).json({ error: 'Ya existe una cuenta con ese código' });
    }

    const empresa = await Empresa.findOne();

    const cuenta = await PlanCuenta.create({
      codigo,
      nombre,
      nivel: nivel || 1,
      padreId: padreId || null,
      tipo,
      clase: clase || null,
      codigoSiat: codigoSiat || null,
      cuentaSiat: cuentaSiat || null,
      empresaId: empresa ? empresa.id : 1,
    });

    res.status(201).json(cuenta);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear cuenta' });
  }
}

async function actualizar(req, res) {
  try {
    const cuenta = await PlanCuenta.findByPk(req.params.id);

    if (!cuenta) {
      return res.status(404).json({ error: 'Cuenta no encontrada' });
    }

    await cuenta.update(req.body);
    res.json(cuenta);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar cuenta' });
  }
}

async function eliminar(req, res) {
  try {
    const cuenta = await PlanCuenta.findByPk(req.params.id);

    if (!cuenta) {
      return res.status(404).json({ error: 'Cuenta no encontrada' });
    }

    const hijos = await PlanCuenta.count({ where: { padreId: cuenta.id } });

    if (hijos > 0) {
      return res.status(400).json({
        error: 'No se puede eliminar: la cuenta tiene cuentas hijas',
      });
    }

    await cuenta.destroy();
    res.json({ mensaje: 'Cuenta eliminada correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar cuenta' });
  }
}

async function generarSiguienteCodigo(req, res) {
  try {
    const { padreId, nivel } = req.query;

    let filtro = { nivel: parseInt(nivel) || 1 };

    if (padreId) {
      filtro.padreId = parseInt(padreId);
    }

    const ultimaCuenta = await PlanCuenta.findOne({
      where: filtro,
      order: [['codigo', 'DESC']],
    });

    let nuevoCodigo;

    if (!ultimaCuenta) {
      nuevoCodigo = nivel === '1' ? '1' : '1';
    } else {
      const partes = ultimaCuenta.codigo.split('.');
      const ultimoNumero = parseInt(partes[partes.length - 1]) + 1;
      partes[partes.length - 1] = ultimoNumero.toString();
      nuevoCodigo = partes.join('.');
    }

    res.json({ codigo: nuevoCodigo });
  } catch (error) {
    res.status(500).json({ error: 'Error al generar código' });
  }
}

module.exports = { listar, obtener, crear, actualizar, eliminar, generarSiguienteCodigo };
