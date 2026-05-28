const PDFDocument = require('pdfkit');
const XLSX = require('xlsx');
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
    const colNames = ['fecha', 'nit', 'razonSocial', 'numeroVenta', 'numeroAutorizacion', 'importeTotal', 'importeExento', 'descuentos', 'codigoControl', 'glosa'];
    const colPatterns = [/^FECHA$/i, /^NIT$/i, /^RAZON|RAZÓN.*SOCIAL|CLIENTE$/i, /^N.*VENTA|N.*FACTURA|N.*DOC/i, /^N.*AUTORIZACI/i, /^IMPORTE.*TOTAL|TOTAL$/i, /^IMPORTE.*EXENTO|EXENTO$/i, /^DESCUENTO/i, /^CODIGO.*CONTROL|C.*CONTROL/i, /^GLOSA|DESCRIPCI/i];
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
      const numeroVenta = String(row[colMap.numeroVenta] || '').trim();

      if (!fecha || !numeroVenta) continue;

      const importeTotal = parseFloat(String(row[colMap.importeTotal] || '0').replace(/[,.]/g, m => m === ',' ? '' : '.')) || 0;
      const importeExento = parseFloat(String(row[colMap.importeExento] || '0').replace(/[,.]/g, m => m === ',' ? '' : '.')) || 0;
      const descuentos = parseFloat(String(row[colMap.descuentos] || '0').replace(/[,.]/g, m => m === ',' ? '' : '.')) || 0;

      await Venta.findOrCreate({
        where: { numeroVenta, empresaId: empresa.id },
        defaults: {
          fecha, nit, razonSocial, numeroVenta,
          numeroAutorizacion: String(row[colMap.numeroAutorizacion] || '').trim(),
          importeTotal, importeExento, descuentos,
          codigoControl: String(row[colMap.codigoControl] || '').trim(),
          glosa: String(row[colMap.glosa] || '').trim(),
          empresaId: empresa.id,
        },
      });
      creadas++;
    }

    res.json({ mensaje: `Importación completada: ${creadas} ventas procesadas`, total: creadas });
  } catch (error) {
    console.error('Error importando ventas:', error);
    res.status(500).json({ error: 'Error al importar ventas desde Excel' });
  }
}

async function exportarPDF(req, res) {
  try {
    const venta = await Venta.findByPk(req.params.id);
    if (!venta) return res.status(404).json({ error: 'Venta no encontrada' });

    const empresa = await Empresa.findOne();
    const doc = new PDFDocument({ margin: 50, size: 'LETTER' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=venta_${venta.numeroVenta}.pdf`);
    doc.pipe(res);

    doc.fontSize(16).font('Helvetica-Bold').text(empresa?.nombre || 'MINI', { align: 'center' });
    doc.fontSize(10).font('Helvetica').text(`NIT: ${empresa?.nit || ''}`, { align: 'center' });
    doc.moveDown(1);
    doc.strokeColor('#cccccc').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

    doc.fontSize(14).font('Helvetica-Bold').text('COMPROBANTE DE VENTA', { align: 'center' });
    doc.moveDown(0.5);

    doc.fontSize(10).font('Helvetica');
    doc.text(`Nº Venta: ${venta.numeroVenta}`);
    doc.text(`Fecha: ${venta.fecha}`);
    doc.text(`NIT: ${venta.nit || '—'}`);
    doc.text(`Cliente: ${venta.razonSocial || 'Consumidor Final'}`);
    doc.text(`Nº Autorización: ${venta.numeroAutorizacion || '—'}`);
    doc.text(`Código Control: ${venta.codigoControl || '—'}`);
    doc.moveDown(0.5);

    const total = parseFloat(venta.importeTotal);
    const desc = parseFloat(venta.descuentos) || 0;
    const exento = parseFloat(venta.importeExento) || 0;
    const base = total - desc - exento;

    doc.strokeColor('#cccccc').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

    doc.text('Importe Total:', 50, doc.y, { continued: true });
    doc.text(`Bs. ${total.toFixed(2)}`, { align: 'right' });
    doc.text('Descuentos:', 50, doc.y, { continued: true });
    doc.text(`Bs. ${desc.toFixed(2)}`, { align: 'right' });
    doc.text('Importe Exento:', 50, doc.y, { continued: true });
    doc.text(`Bs. ${exento.toFixed(2)}`, { align: 'right' });
    doc.text('Base Imponible:', 50, doc.y, { continued: true });
    doc.text(`Bs. ${base.toFixed(2)}`, { align: 'right' });
    doc.text('Débito Fiscal IVA 13%:', 50, doc.y, { continued: true });
    doc.text(`Bs. ${(base * 0.13).toFixed(2)}`, { align: 'right' });
    doc.text('IT 3%:', 50, doc.y, { continued: true });
    doc.text(`Bs. ${(base * 0.03).toFixed(2)}`, { align: 'right' });
    doc.text('Neto:', 50, doc.y, { continued: true });
    doc.text(`Bs. ${base.toFixed(2)}`, { align: 'right' });

    doc.moveDown(0.5);
    doc.strokeColor('#cccccc').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown(0.5);

    if (venta.glosa) {
      doc.text(`Glosa: ${venta.glosa}`);
      doc.moveDown(0.5);
    }

    doc.fontSize(9).text(`Estado: ${venta.contabilizado ? 'Contabilizado' : 'Pendiente'}`, { align: 'center' });

    doc.fontSize(7).font('Helvetica').text(
      `Generado: ${new Date().toLocaleString('es-BO')} | MINI`,
      50, doc.page.height - 40, { align: 'center' }
    );

    doc.end();
  } catch (error) {
    console.error('Error exportando PDF venta:', error);
    res.status(500).json({ error: 'Error al exportar PDF' });
  }
}

module.exports = { listar, obtener, crear, actualizar, eliminar, contabilizar, importarExcel, exportarPDF };
