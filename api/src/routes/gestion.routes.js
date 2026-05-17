const express = require('express');
const router = express.Router();
const gestionController = require('../controllers/gestion.controller');
const authMiddleware = require('../middleware/auth');
const { requirePermisos } = require('../middleware/roles');

router.use(authMiddleware);

router.get('/', gestionController.listar);
router.get('/actual', gestionController.obtenerActual);
router.get('/:id', gestionController.obtener);
router.post('/', requirePermisos('config:update'), gestionController.crear);
router.put('/:id', requirePermisos('config:update'), gestionController.actualizar);
router.post('/:id/establecer-actual', requirePermisos('config:update'), gestionController.establecerActual);
router.delete('/:id', requirePermisos('config:update'), gestionController.eliminar);

module.exports = router;
