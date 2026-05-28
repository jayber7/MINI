const { PlanCuenta, Empresa } = require('../models');
const { Op } = require('sequelize');
const XLSX = require('xlsx');

async function listar(req, res) {
  try {
    const cuentas = await PlanCuenta.findAll({
      where: { empresaId: req.empresaId },
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

  const cuenta = await PlanCuenta.create({
    codigo,
    nombre,
    nivel: nivel || 1,
    padreId: padreId || null,
    tipo,
    clase: clase || null,
    codigoSiat: codigoSiat || null,
    cuentaSiat: cuentaSiat || null,
    empresaId: req.empresaId,
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

async function importarDesdeExcel(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Debe subir un archivo Excel' });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const raw = XLSX.utils.sheet_to_json(sheet, { defval: '', header: 1 });

    // Find header row and data rows
    let headerIdx = -1;
    for (let i = 0; i < Math.min(raw.length, 5); i++) {
      const row = raw[i];
      if (String(row[0] || '').trim().toUpperCase() === 'CUENTA') {
        headerIdx = i;
        break;
      }
    }
    if (headerIdx === -1) headerIdx = 0;
    const header = raw[headerIdx] || [];
    const colMap = {};
    const colNames = ['codigo', 'nombre', 'nivel', 'mayor', 'tipo'];
    const colPatterns = [/^CUENTA$/i, /^NOMBRE|DESCRIPCIÓN|DESCRIPCION|PLAN DE CUENTAS$/i, /^NIVEL$/i, /^MAYOR$/i, /^TIPO$/i];
    for (let c = 0; c < header.length; c++) {
      const h = String(header[c] || '').trim();
      for (let p = 0; p < colPatterns.length; p++) {
        if (colPatterns[p].test(h)) {
          colMap[colNames[p]] = c;
          break;
        }
      }
    }

    const tipoMap = {
      'ACTIVO': 'Activo',
      'PASIVO': 'Pasivo',
      'PATRIMONIO': 'Patrimonio',
      'INGRESO': 'Ingreso',
      'GASTO': 'Gasto',
      'ORDEN': 'Orden',
      'CONTINGENTES': 'Contingentes',
      'CONTINGENTE': 'Contingentes',
    };

    const cuentasCreadas = [];
    for (let i = headerIdx + 1; i < raw.length; i++) {
      const row = raw[i];
      const codigo = String(row[colMap.codigo] || '').trim();
      const nombre = String(row[colMap.nombre] || '').trim();
      const nivel = parseInt(row[colMap.nivel] || 1);
      const tipoRaw = String(row[colMap.tipo] || '').trim().toUpperCase();
      const tipo = tipoMap[tipoRaw] || 'Activo';
      const clase = '';

      if (!codigo || !nombre) continue;

      const [cuenta] = await PlanCuenta.findOrCreate({
        where: { codigo, empresaId: req.empresaId },
        defaults: {
          codigo,
          nombre,
          nivel,
          tipo,
          clase,
          empresaId: req.empresaId,
        },
      });
      cuentasCreadas.push({ codigo, id: cuenta.id, nivel, row });
    }

    for (const item of cuentasCreadas) {
      const mayorCode = String(item.row[colMap.mayor] || '').trim();
      if (!mayorCode || mayorCode === '0') continue;

      const padre = cuentasCreadas.find(c => c.codigo === mayorCode);
      if (padre) {
        await PlanCuenta.update({ padreId: padre.id }, { where: { id: item.id } });
      }
    }

    res.json({
      mensaje: `Importación completada: ${cuentasCreadas.length} cuentas procesadas`,
      total: cuentasCreadas.length,
    });
  } catch (error) {
    console.error('Error al importar plan de cuentas:', error);
    res.status(500).json({ error: 'Error al importar plan de cuentas' });
  }
}

module.exports = { listar, obtener, crear, actualizar, eliminar, generarSiguienteCodigo, importarDesdeExcel };
