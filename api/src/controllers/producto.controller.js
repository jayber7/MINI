const { Producto, MovimientoInventario } = require('../models');
const { Op, Sequelize } = require('sequelize');

async function listar(req, res) {
  try {
    const { search, categoria, activo } = req.query;
    const where = { empresaId: req.empresaId };

    if (search) {
      where[Op.or] = [
        { nombre: { [Op.like]: `%${search}%` } },
        { codigo: { [Op.like]: `%${search}%` } },
      ];
    }
    if (categoria) where.categoria = categoria;
    if (activo !== undefined) where.activo = activo === 'true';

    const items = await Producto.findAll({ where, order: [['nombre', 'ASC']] });
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: 'Error al listar productos' });
  }
}

async function obtener(req, res) {
  try {
    const item = await Producto.findOne({
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
    const item = await Producto.create({ ...req.body, empresaId: req.empresaId });
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear' });
  }
}

async function actualizar(req, res) {
  try {
    const item = await Producto.findOne({
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
    const item = await Producto.findOne({
      where: { id: req.params.id, empresaId: req.empresaId },
    });
    if (!item) return res.status(404).json({ error: 'No encontrado' });
    await item.destroy();
    res.json({ mensaje: 'Eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar' });
  }
}

async function obtenerKardex(req, res) {
  try {
    const { productoId } = req.params;
    const movimientos = await MovimientoInventario.findAll({
      where: { productoId, empresaId: req.empresaId },
      order: [['fecha', 'ASC'], ['createdAt', 'ASC']],
    });
    res.json(movimientos);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener kardex' });
  }
}

async function registrarMovimiento(req, res) {
  try {
    const { tipo, cantidad, productoId, documentoRef, proveedorCliente, motivo } = req.body;

    const producto = await Producto.findOne({
      where: { id: productoId, empresaId: req.empresaId },
    });
    if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });

    const stockAnterior = producto.stockActual;
    let stockPosterior = stockAnterior;
    let costoUnitario = producto.costoUnitario;
    let costoPromedio = producto.costoUnitario;

    if (tipo === 'entrada') {
      stockPosterior = stockAnterior + cantidad;
      const nuevoCostoTotal = (stockAnterior * costoUnitario) + (cantidad * (parseFloat(req.body.costoUnitario) || costoUnitario));
      costoPromedio = stockPosterior > 0 ? nuevoCostoTotal / stockPosterior : 0;
      await producto.update({
        stockActual: stockPosterior,
        costoUnitario: costoPromedio,
      });
    } else if (tipo === 'salida') {
      stockPosterior = Math.max(0, stockAnterior - cantidad);
      costoPromedio = costoUnitario;
      await producto.update({ stockActual: stockPosterior });
    } else {
      stockPosterior = cantidad;
      await producto.update({ stockActual: stockPosterior });
    }

    const costoTotal = cantidad * costoUnitario;
    const movimiento = await MovimientoInventario.create({
      tipo,
      cantidad,
      costoUnitario,
      costoTotal,
      stockAnterior,
      stockPosterior,
      costoPromedio,
      documentoRef,
      proveedorCliente,
      motivo,
      productoId,
      empresaId: req.empresaId,
      fecha: req.body.fecha || new Date(),
    });

    res.status(201).json(movimiento);
  } catch (error) {
    res.status(500).json({ error: 'Error al registrar movimiento' });
  }
}

async function alertasStock(req, res) {
  try {
    const items = await Producto.findAll({
      where: {
        empresaId: req.empresaId,
        activo: true,
        stockActual: { [Op.lte]: Sequelize.col('stockMinimo') },
      },
      order: [['stockActual', 'ASC']],
    });
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener alertas' });
  }
}

module.exports = { listar, obtener, crear, actualizar, eliminar, obtenerKardex, registrarMovimiento, alertasStock };
