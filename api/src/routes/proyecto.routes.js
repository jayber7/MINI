const express = require('express');
const router = express.Router();
const proyectoController = require('../controllers/proyecto.controller');
const authMiddleware = require('../middleware/auth');
const { requirePermisos } = require('../middleware/roles');

router.use(authMiddleware);

router.get('/', proyectoController.listar);
router.get('/:id', proyectoController.obtener);
router.post('/', requirePermisos('config:update'), proyectoController.crear);
router.put('/:id', requirePermisos('config:update'), proyectoController.actualizar);
router.delete('/:id', requirePermisos('config:update'), proyectoController.eliminar);

module.exports = router;
