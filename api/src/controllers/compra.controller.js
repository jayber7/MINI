const PDFDocument = require('pdfkit');
const XLSX = require('xlsx');
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

async function importarExcel(req, res) {
  try {
    if (!req.file) return res.status(400).json({ error: 'Debe subir un archivo Excel' });

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const raw = XLSX.utils.sheet_to_json(sheet, { defval: '', header: 1 });

    let headerIdx = -1;
    for (let i = 0; i < Math.min(raw.length, 5); i++) {
      const row = raw[i];
      const first = String(row[0] || '').trim().toUpperCase();
      if (first === 'FECHA' || first === 'NIT') { headerIdx = i; break; }
    }
    if (headerIdx === -1) headerIdx = 0;
    const header = raw[headerIdx] || [];
    const colNames = ['fecha', 'nit', 'razonSocial', 'numeroCompra', 'numeroDui', 'numeroAutorizacion', 'importeTotal', 'importeNoSujeto', 'descuentos', 'codigoControl', 'glosa'];
    const colPatterns = [/^FECHA$/i, /^NIT$/i, /^RAZON|RAZÓN.*SOCIAL$/i, /^N.*COMPRA|N.*FACTURA|N.*DOC/i, /^N.*DUI$/i, /^N.*AUTORIZACI/i, /^IMPORTE.*TOTAL|TOTAL$/i, /^IMPORTE.*NO.*SUJETO|NO.*SUJETO$/i, /^DESCUENTO/i, /^CODIGO.*CONTROL|C.*CONTROL/i, /^GLOSA|DESCRIPCI/i];
    const colMap = {};
    for (let c = 0; c < header.length; c++) {
      const h = String(header[c] || '').trim();
      for (let p = 0; p < colPatterns.length; p++) {
        if (colPatterns[p].test(h)) { colMap[colNames[p]] = c; break; }
      }
    }

    const empresa = await Empresa.findOne();
    if (!empresa) return res.status(400).json({ error: 'No hay empresa configurada' });

    let creadas = 0;
    for (let i = headerIdx + 1; i < raw.length; i++) {
      const row = raw[i];
      const fecha = String(row[colMap.fecha] || '').trim();
      const nit = String(row[colMap.nit] || '').trim();
      const razonSocial = String(row[colMap.razonSocial] || '').trim();
      const numeroCompra = String(row[colMap.numeroCompra] || '').trim();

      if (!fecha || !numeroCompra || !nit) continue;

      const importeTotal = parseFloat(String(row[colMap.importeTotal] || '0').replace(/[,.]/g, m => m === ',' ? '' : '.')) || 0;
      const importeNoSujeto = parseFloat(String(row[colMap.importeNoSujeto] || '0').replace(/[,.]/g, m => m === ',' ? '' : '.')) || 0;
      const descuentos = parseFloat(String(row[colMap.descuentos] || '0').replace(/[,.]/g, m => m === ',' ? '' : '.')) || 0;

      await Compra.findOrCreate({
        where: { numeroCompra, empresaId: empresa.id },
        defaults: {
          fecha, nit, razonSocial, numeroCompra,
          numeroDui: String(row[colMap.numeroDui] || '').trim(),
          numeroAutorizacion: String(row[colMap.numeroAutorizacion] || '').trim(),
          importeTotal, importeNoSujeto, descuentos,
          codigoControl: String(row[colMap.codigoControl] || '').trim(),
          glosa: String(row[colMap.glosa] || '').trim(),
          empresaId: empresa.id,
        },
      });
      creadas++;
    }

    res.json({ mensaje: `Importación completada: ${creadas} compras procesadas`, total: creadas });
  } catch (error) {
    console.error('Error importando compras:', error);
    res.status(500).json({ error: 'Error al importar compras desde Excel' });
  }
}

async function exportarPDF(req, res) {
  try {
    const compra = await Compra.findByPk(req.params.id);
    if (!compra) return res.status(404).json({ error: 'Compra no encontrada' });

    const empresa = await Empresa.findOne();
    const doc = new PDFDocument({ margin: 50, size: 'LETTER' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=compra_${compra.numeroCompra}.pdf`);
    doc.pipe(res);

    doc.fontSize(16).font('Helvetica-Bold').text(empresa?.nombre || 'MINI', { align: 'center' });
    doc.fontSize(10).font('Helvetica').text(`NIT: ${empresa?.nit || ''}`, { align: 'center' });
    doc.moveDown(1);
    doc.strokeColor('#cccccc').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

    doc.fontSize(14).font('Helvetica-Bold').text('COMPROBANTE DE COMPRA', { align: 'center' });
    doc.moveDown(0.5);

    const yStart = doc.y;
    doc.fontSize(10).font('Helvetica');
    doc.text(`Nº Compra: ${compra.numeroCompra}`, 50, yStart);
    doc.text(`Fecha: ${compra.fecha}`, 300, yStart);
    doc.moveDown(0.3);
    doc.text(`NIT: ${compra.nit}`);
    doc.text(`Proveedor: ${compra.razonSocial}`);
    doc.text(`Nº DUI: ${compra.numeroDui || '—'}`);
    doc.text(`Nº Autorización: ${compra.numeroAutorizacion || '—'}`);
    doc.text(`Código Control: ${compra.codigoControl || '—'}`);
    doc.moveDown(0.5);

    const total = parseFloat(compra.importeTotal);
    const desc = parseFloat(compra.descuentos) || 0;
    const noSujeto = parseFloat(compra.importeNoSujeto) || 0;
    const base = total - desc - noSujeto;
    const cf = base * 0.13;

    doc.strokeColor('#cccccc').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

    const leftX = 50;
    const labelX = 380;
    doc.text('Importe Total:', leftX, doc.y, { continued: true });
    doc.text(`Bs. ${total.toFixed(2)}`, { align: 'right' });
    doc.text('Descuentos:', leftX, doc.y, { continued: true });
    doc.text(`Bs. ${desc.toFixed(2)}`, { align: 'right' });
    doc.text('Importe No Sujeto:', leftX, doc.y, { continued: true });
    doc.text(`Bs. ${noSujeto.toFixed(2)}`, { align: 'right' });
    doc.text('Base Imponible:', leftX, doc.y, { continued: true });
    doc.text(`Bs. ${base.toFixed(2)}`, { align: 'right' });
    doc.text('Crédito Fiscal IVA 13%:', leftX, doc.y, { continued: true });
    doc.text(`Bs. ${cf.toFixed(2)}`, { align: 'right' });
    doc.text('Neto 87%:', leftX, doc.y, { continued: true });
    doc.text(`Bs. ${(base * 0.87).toFixed(2)}`, { align: 'right' });

    doc.moveDown(0.5);
    doc.strokeColor('#cccccc').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

    if (compra.glosa) {
      doc.fontSize(10).text(`Glosa: ${compra.glosa}`);
      doc.moveDown(0.5);
    }

    doc.fontSize(9).text(`Estado: ${compra.contabilizado ? 'Contabilizado' : 'Pendiente'}`, { align: 'center' });

    doc.fontSize(7).font('Helvetica').text(
      `Generado: ${new Date().toLocaleString('es-BO')} | MINI`,
      50, doc.page.height - 40, { align: 'center' }
    );

    doc.end();
  } catch (error) {
    console.error('Error exportando PDF compra:', error);
    res.status(500).json({ error: 'Error al exportar PDF' });
  }
}

module.exports = { listar, obtener, crear, actualizar, eliminar, contabilizar, importarExcel, exportarPDF };
