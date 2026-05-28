const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const { Comprobante, ComprobanteDetalle, PlanCuenta, Empresa } = require('../models');
const { Op } = require('sequelize');

function configurarCabeceraPDF(doc, empresa) {
  doc.fontSize(16).font('Helvetica-Bold').text(empresa?.nombre || 'MINI', { align: 'center' });
  doc.fontSize(10).font('Helvetica').text(`NIT: ${empresa?.nit || ''}`, { align: 'center' });
  if (empresa?.direccion) {
    doc.text(empresa.direccion, { align: 'center' });
  }
  doc.moveDown(0.5);
  doc.strokeColor('#cccccc').lineWidth(1).moveTo(50, doc.y).lineTo(550, doc.y).stroke();
  doc.moveDown(0.5);
}

function configurarPiePDF(doc, empresa) {
  const firmas = [
    { titulo: empresa?.tituloContador || '', nombre: empresa?.firmaContador || '' },
    { titulo: empresa?.tituloPropietario || '', nombre: empresa?.firmaPropietario || '' },
    { titulo: empresa?.tituloRepresentanteLegal || '', nombre: empresa?.firmaRepresentanteLegal || '' },
  ].filter(f => f.nombre || f.titulo);

  if (firmas.length > 0) {
    const y = doc.page.height - 100;
    const startX = 50;
    const width = 150;

    firmas.forEach((f, i) => {
      const x = startX + i * (width + 50);
      doc.strokeColor('#000000').lineWidth(0.5)
        .moveTo(x, y).lineTo(x + width, y).stroke();
      doc.fontSize(8).font('Helvetica-Bold').text(f.nombre || '', {
        align: 'center',
        width: width,
      });
      doc.fontSize(7).font('Helvetica').text(f.titulo || '', {
        align: 'center',
        width: width,
      });
    });
  }

  doc.fontSize(7).font('Helvetica').text(
    `Generado: ${new Date().toLocaleString('es-BO')} | MINI`,
    50, doc.page.height - 30, { align: 'center' }
  );
}

function formatBs(n) {
  return `Bs. ${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

async function exportarComprobantePDF(req, res) {
  try {
    const comprobante = await Comprobante.findOne({
      where: { id: req.params.id, empresaId: req.empresaId },
      include: [
        {
          model: ComprobanteDetalle,
          include: [{ model: PlanCuenta, attributes: ['codigo', 'nombre', 'tipo'] }],
        },
        { model: require('../models').ClienteProveedor, attributes: ['razonSocial', 'nit'] },
      ],
    });

    if (!comprobante) {
      return res.status(404).json({ error: 'Comprobante no encontrado' });
    }

    const empresa = await Empresa.findByPk(req.empresaId || req.query.empresaId) || await Empresa.findOne();
    const doc = new PDFDocument({ size: 'LETTER', margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=comprobante_${comprobante.numero}.pdf`);
    doc.pipe(res);

    configurarCabeceraPDF(doc, empresa);

    doc.fontSize(14).font('Helvetica-Bold').text('COMPROBANTE CONTABLE', { align: 'center' });
    doc.moveDown(0.5);

    doc.fontSize(10).font('Helvetica');
    const infoY = doc.y;
    const halfWidth = 250;
    doc.text(`Nº: ${String(comprobante.numero).padStart(4, '0')}`, 50, infoY);
    doc.text(`Fecha: ${comprobante.fecha}`, 50 + halfWidth, infoY);
    doc.text(`Tipo: ${comprobante.tipoComprobante.toUpperCase()}`, 50 + halfWidth * 2 - 50, infoY);

    if (comprobante.ClienteProveedor) {
      doc.text(`Cliente: ${comprobante.ClienteProveedor.razonSocial}`, 50, doc.y);
      doc.moveDown(0.2);
      doc.text(`NIT: ${comprobante.ClienteProveedor.nit}`, 50, doc.y + 2);
    }

    doc.moveDown(0.5);
    doc.text(`Glosa: ${comprobante.glosa}`);
    doc.text(`Estado: ${comprobante.estado.toUpperCase()} | Pago: ${comprobante.pagado ? 'Pagado' : 'Pendiente'}`);
    if (comprobante.cheque) doc.text(`Cheque Nº: ${comprobante.cheque}`);
    if (comprobante.usd || comprobante.ufv) {
      let tasas = 'Tasas: ';
      if (comprobante.usd) tasas += `USD ${comprobante.usd} `;
      if (comprobante.ufv) tasas += `| UFV ${comprobante.ufv}`;
      doc.text(tasas);
    }
    doc.moveDown(1);

    // Tabla con bordes
    const tableTop = doc.y;
    const colWidths = [70, 190, 100, 100];
    const startX = 50;

    function drawTableBorder(x, y, w, h) {
      doc.strokeColor('#000000').lineWidth(0.5).rect(x, y, w, h).stroke();
    }

    // Header
    const headers = ['Cuenta', 'Descripción', 'Debe', 'Haber'];
    doc.fontSize(8).font('Helvetica-Bold');
    let x = startX;
    headers.forEach((h, i) => {
      doc.text(h, x + 2, tableTop + 3, { width: colWidths[i] - 4, align: i >= 2 ? 'right' : 'left' });
      x += colWidths[i];
    });

    drawTableBorder(startX, tableTop, colWidths.reduce((a, b) => a + b, 0), 15);

    let y = tableTop + 15;
    doc.fontSize(8).font('Helvetica');

    let totalDebe = 0;
    let totalHaber = 0;

    comprobante.ComprobanteDetalles.forEach((d) => {
      const debe = parseFloat(d.debe) || 0;
      const haber = parseFloat(d.haber) || 0;
      totalDebe += debe;
      totalHaber += haber;

      x = startX;
      doc.text(d.PlanCuentum?.codigo || '', x + 2, y + 3, { width: colWidths[0] - 4 });
      x += colWidths[0];
      doc.text(`${d.PlanCuentum?.nombre || ''}${d.glosa ? ` - ${d.glosa}` : ''}`, x + 2, y + 3, { width: colWidths[1] - 4 });
      x += colWidths[1];
      doc.text(debe > 0 ? formatBs(debe) : '', x + 2, y + 3, { width: colWidths[2] - 4, align: 'right' });
      x += colWidths[2];
      doc.text(haber > 0 ? formatBs(haber) : '', x + 2, y + 3, { width: colWidths[3] - 4, align: 'right' });

      drawTableBorder(startX, y, colWidths.reduce((a, b) => a + b, 0), 15);
      y += 15;

      if (y > doc.page.height - 150) {
        doc.addPage();
        y = 50;
      }
    });

    // Total row
    doc.font('Helvetica-Bold');
    x = startX;
    doc.text('TOTALES', x + 2, y + 3, { width: colWidths[0] + colWidths[1] - 4 });
    x += colWidths[0] + colWidths[1];
    doc.text(formatBs(totalDebe), x + 2, y + 3, { width: colWidths[2] - 4, align: 'right' });
    x += colWidths[2];
    doc.text(formatBs(totalHaber), x + 2, y + 3, { width: colWidths[3] - 4, align: 'right' });

    drawTableBorder(startX, y, colWidths.reduce((a, b) => a + b, 0), 15);

    configurarPiePDF(doc, empresa);
    doc.end();
  } catch (error) {
    console.error('Error exportando comprobante PDF:', error);
    res.status(500).json({ error: 'Error al generar PDF' });
  }
}

async function exportarTablaPDF(req, res, titulo, obtenerDatos) {
  try {
    const { desde, hasta } = req.query;
    const datos = await obtenerDatos(desde, hasta, req.empresaId);
    const empresa = await Empresa.findByPk(req.empresaId) || await Empresa.findOne();
    const doc = new PDFDocument({ size: 'LETTER', margin: 50, layout: 'landscape' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${titulo.toLowerCase().replace(/\s+/g, '_')}.pdf`);
    doc.pipe(res);

    configurarCabeceraPDF(doc, empresa);
    doc.fontSize(14).font('Helvetica-Bold').text(titulo.toUpperCase(), { align: 'center' });
    if (desde || hasta) {
      doc.fontSize(9).font('Helvetica').text(`Período: ${desde || 'Inicio'} - ${hasta || 'Fin'}`, { align: 'center' });
    }
    doc.moveDown(1);

    datos.forEach((item) => {
      doc.fontSize(11).font('Helvetica-Bold').text(item.titulo || '');
      doc.moveDown(0.3);

      if (item.tabla) {
        const tableTop = doc.y;
        const colWidths = item.colWidths || [80, 250, 100, 100];
        const headers = item.headers || ['Código', 'Cuenta', 'Debe', 'Haber'];

        doc.fontSize(8).font('Helvetica-Bold');
        let x = 50;
        headers.forEach((h, i) => {
          doc.text(h, x, tableTop, { width: colWidths[i], align: i >= 2 ? 'right' : 'left' });
          x += colWidths[i];
        });

        doc.strokeColor('#cccccc').lineWidth(0.5)
          .moveTo(50, tableTop + 12).lineTo(750, tableTop + 12).stroke();

        let y = tableTop + 17;
        doc.fontSize(8).font('Helvetica');

        item.tabla.forEach((row) => {
          x = 50;
          row.forEach((cell, i) => {
            doc.text(cell.toString(), x, y, {
              width: colWidths[i],
              align: i >= 2 ? 'right' : 'left',
            });
            x += colWidths[i];
          });
          y += 12;

          if (y > doc.page.height - 120) {
            doc.addPage();
            y = 50;
          }
        });

        if (item.totales) {
          y += 5;
          doc.strokeColor('#000000').lineWidth(1)
            .moveTo(50, y).lineTo(750, y).stroke();
          y += 5;
          doc.font('Helvetica-Bold');
          x = 50;
          item.totales.forEach((total, i) => {
            doc.text(total, x, y, {
              width: colWidths[i],
              align: i >= 2 ? 'right' : 'left',
            });
            x += colWidths[i];
          });
        }
      }

      doc.moveDown(1);
    });

    configurarPiePDF(doc, empresa);
    doc.end();
  } catch (error) {
    console.error(`Error exportando ${titulo} PDF:`, error);
    res.status(500).json({ error: 'Error al generar PDF' });
  }
}

async function exportarExcelGenerico(req, res, titulo, obtenerDatos) {
  try {
    const { desde, hasta } = req.query;
    const datos = await obtenerDatos(desde, hasta, req.empresaId);
    const empresa = await Empresa.findByPk(req.empresaId) || await Empresa.findOne();

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(titulo);

    // Encabezado
    worksheet.addRow([empresa?.nombre || 'MINI']);
    worksheet.addRow([`NIT: ${empresa?.nit || ''}`]);
    worksheet.addRow([titulo]);
    if (desde || hasta) {
      worksheet.addRow([`Período: ${desde || 'Inicio'} - ${hasta || 'Fin'}`]);
    }
    worksheet.addRow([]);

    datos.forEach((item) => {
      if (item.tabla) {
        worksheet.addRow([item.titulo || '']);
        const headerRow = worksheet.addRow(item.headers || ['Código', 'Cuenta', 'Debe', 'Haber']);
        headerRow.eachCell((cell) => {
          cell.font = { bold: true };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFD9E2F3' },
          };
        });

        item.tabla.forEach((row) => {
          const dataRow = worksheet.addRow(row);
          dataRow.eachCell((cell, colNumber) => {
            if (colNumber >= 3) {
              cell.numFmt = '#,##0.00';
            }
          });
        });

        if (item.totales) {
          const totalRow = worksheet.addRow(item.totales);
          totalRow.font = { bold: true };
          totalRow.eachCell((cell, colNumber) => {
            if (colNumber >= 3) {
              cell.numFmt = '#,##0.00';
            }
          });
        }

        worksheet.addRow([]);
      }
    });

    // Firmas
    worksheet.addRow([]);
    const firmas = [
      empresa?.firmaContador,
      empresa?.firmaPropietario,
      empresa?.firmaRepresentanteLegal,
    ].filter(Boolean);

    if (firmas.length > 0) {
      const firmaRow = worksheet.addRow(firmas);
      firmaRow.eachCell((cell) => {
        cell.border = { top: { style: 'thin' } };
      });
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${titulo.toLowerCase().replace(/\s+/g, '_')}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error(`Error exportando ${titulo} Excel:`, error);
    res.status(500).json({ error: 'Error al generar Excel' });
  }
}

module.exports = {
  exportarComprobantePDF,
  exportarTablaPDF,
  exportarExcelGenerico,
};
