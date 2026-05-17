const express = require('express');
const router = express.Router();
const usuarioController = require('../controllers/usuario.controller');
const authMiddleware = require('../middleware/auth');
const { requireRol } = require('../middleware/roles');

router.use(authMiddleware);
router.use(requireRol('admin'));

router.get('/', usuarioController.listar);
router.get('/:id', usuarioController.obtener);
router.post('/', usuarioController.crear);
router.put('/:id', usuarioController.actualizar);
router.put('/:id/password', usuarioController.cambiarPassword);
router.delete('/:id', usuarioController.eliminar);

module.exports = router;
