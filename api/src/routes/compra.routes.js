const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/compra.controller');
const auth = require('../middleware/auth');
const { requirePermisos } = require('../middleware/roles');

router.get('/', auth, ctrl.listar);
router.get('/:id', auth, ctrl.obtener);
router.post('/', auth, requirePermisos('comprobantes:create'), ctrl.crear);
router.put('/:id', auth, requirePermisos('comprobantes:update'), ctrl.actualizar);
router.delete('/:id', auth, requirePermisos('comprobantes:anular'), ctrl.eliminar);
router.post('/:id/contabilizar', auth, requirePermisos('comprobantes:anular'), ctrl.contabilizar);

module.exports = router;
