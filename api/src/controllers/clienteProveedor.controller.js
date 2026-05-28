const { ClienteProveedor } = require('../models');
const { Op } = require('sequelize');

async function listar(req, res) {
  try {
    const { tipo, search } = req.query;
    const where = { empresaId: req.empresaId };

    if (tipo) where.tipo = tipo;
    if (search) {
      where[Op.or] = [
        { razonSocial: { [Op.like]: `%${search}%` } },
        { nit: { [Op.like]: `%${search}%` } },
      ];
    }

    const items = await ClienteProveedor.findAll({ where, order: [['razonSocial', 'ASC']] });
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: 'Error al listar clientes/proveedores' });
  }
}

async function obtener(req, res) {
  try {
    const item = await ClienteProveedor.findOne({
      where: { id: req.params.id, empresaId: req.empresaId },
    });
    if (!item) return res.status(404).json({ error: 'No encontrado' });
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener' });
  }
}

async function crear(req, res) {
  try {
    const item = await ClienteProveedor.create({ ...req.body, empresaId: req.empresaId });
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear' });
  }
}

async function actualizar(req, res) {
  try {
    const item = await ClienteProveedor.findOne({
      where: { id: req.params.id, empresaId: req.empresaId },
    });
    if (!item) return res.status(404).json({ error: 'No encontrado' });
    await item.update(req.body);
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar' });
  }
}

async function eliminar(req, res) {
  try {
    const item = await ClienteProveedor.findOne({
      where: { id: req.params.id, empresaId: req.empresaId },
    });
    if (!item) return res.status(404).json({ error: 'No encontrado' });
    await item.destroy();
    res.json({ mensaje: 'Eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar' });
  }
}

async function importarCsv(req, res) {
  try {
    if (!req.file) return res.status(400).json({ error: 'Debe subir un archivo CSV' });

    const tipo = req.params.tipo || 'cliente';
    const content = req.file.buffer.toString('utf8');
    const lines = content.split('\n').filter(l => l.trim());

    if (lines.length < 2) return res.status(400).json({ error: 'CSV vacío o solo encabezados' });

    const header = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim().toLowerCase());
    const idxCodigo = header.findIndex(h => h.includes('codigo'));
    const idxNombre = header.findIndex(h => h.includes('nombre') || h.includes('razon'));
    const idxDireccion = header.findIndex(h => h.includes('direccion'));
    const idxTelefono = header.findIndex(h => h.includes('telefono'));
    const idxLimite = header.findIndex(h => h.includes('limite'));

    let creados = 0;
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.replace(/^"|"$/g, '').trim());
      const nit = cols[idxCodigo] || '';
      const razonSocial = cols[idxNombre] || '';
      const direccion = cols[idxDireccion] || '';
      const telefono = cols[idxTelefono] || '';

      if (!nit || !razonSocial) continue;

      const [existente] = await ClienteProveedor.findOrCreate({
        where: { nit, empresaId: req.empresaId },
        defaults: { tipo, nit, razonSocial, direccion, telefono, empresaId: req.empresaId },
      });

      if (existente) creados++;
    }

    res.json({ mensaje: `Importación completada: ${creados} registros procesados`, total: creados });
  } catch (error) {
    console.error('Error al importar CSV:', error);
    res.status(500).json({ error: 'Error al importar CSV' });
  }
}

module.exports = { listar, obtener, crear, actualizar, eliminar, importarCsv };
