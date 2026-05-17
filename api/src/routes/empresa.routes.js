const express = require('express');
const router = express.Router();
const empresaController = require('../controllers/empresa.controller');
const authMiddleware = require('../middleware/auth');
const { requirePermisos } = require('../middleware/roles');

router.use(authMiddleware);

router.get('/', empresaController.obtenerPrimera);
router.get('/lista', empresaController.listar);
router.get('/:id', empresaController.obtener);
router.post('/', requirePermisos('config:update'), empresaController.crear);
router.put('/:id', requirePermisos('config:update'), empresaController.actualizar);
router.delete('/:id', requirePermisos('config:update'), empresaController.eliminar);

module.exports = router;
