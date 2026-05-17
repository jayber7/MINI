const express = require('express');
const router = express.Router();
const rolController = require('../controllers/rol.controller');
const authMiddleware = require('../middleware/auth');
const { requireRol } = require('../middleware/roles');

router.use(authMiddleware);

router.get('/permisos', rolController.listarPermisos);

router.use(requireRol('admin'));

router.get('/', rolController.listar);
router.get('/:id', rolController.obtener);
router.post('/', rolController.crear);
router.put('/:id', rolController.actualizar);
router.put('/:id/permisos', rolController.asignarPermisos);
router.delete('/:id', rolController.eliminar);

module.exports = router;
