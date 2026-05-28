const express = require('express');
const router = express.Router();
const controller = require('../controllers/producto.controller');
const authMiddleware = require('../middleware/auth');
const empresaMiddleware = require('../middleware/empresa');

router.use(authMiddleware);
router.use(empresaMiddleware);

router.get('/', controller.listar);
router.get('/alertas-stock', controller.alertasStock);
router.get('/:id', controller.obtener);
router.post('/', controller.crear);
router.put('/:id', controller.actualizar);
router.delete('/:id', controller.eliminar);
router.get('/:productoId/kardex', controller.obtenerKardex);
router.post('/movimiento', controller.registrarMovimiento);

module.exports = router;
