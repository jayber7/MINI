const express = require('express');
const router = express.Router();
const planController = require('../controllers/plan.controller');
const authMiddleware = require('../middleware/auth');
const { requirePermisos } = require('../middleware/roles');

router.use(authMiddleware);

router.get('/', planController.listar);
router.get('/siguiente-codigo', planController.generarSiguienteCodigo);
router.get('/:id', planController.obtener);
router.post('/', requirePermisos('plan:create'), planController.crear);
router.put('/:id', requirePermisos('plan:update'), planController.actualizar);
router.delete('/:id', requirePermisos('plan:delete'), planController.eliminar);

module.exports = router;
