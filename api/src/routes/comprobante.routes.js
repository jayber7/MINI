const express = require('express');
const router = express.Router();
const comprobanteController = require('../controllers/comprobante.controller');
const authMiddleware = require('../middleware/auth');
const { requirePermisos } = require('../middleware/roles');

router.use(authMiddleware);

router.get('/', requirePermisos('comprobantes:read'), comprobanteController.listar);
router.get('/kpis', requirePermisos('comprobantes:read'), comprobanteController.kpis);
router.get('/:id', requirePermisos('comprobantes:read'), comprobanteController.obtener);
router.get('/:comprobanteId/totales', requirePermisos('comprobantes:read'), comprobanteController.obtenerTotales);
router.post('/', requirePermisos('comprobantes:create'), comprobanteController.crear);
router.put('/:id', requirePermisos('comprobantes:update'), comprobanteController.actualizar);
router.post('/:id/anular', requirePermisos('comprobantes:anular'), comprobanteController.anular);
router.post('/:id/contabilizar', requirePermisos('comprobantes:contabilizar'), comprobanteController.contabilizar);
router.post('/:id/marcar-pagado', requirePermisos('comprobantes:update'), comprobanteController.marcarPagado);
router.delete('/:id', requirePermisos('comprobantes:update'), comprobanteController.eliminar);

module.exports = router;
