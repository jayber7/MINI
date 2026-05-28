const express = require('express');
const router = express.Router();
const multer = require('multer');
const ctrl = require('../controllers/venta.controller');
const auth = require('../middleware/auth');
const { requirePermisos } = require('../middleware/roles');

const upload = multer({ storage: multer.memoryStorage() });

router.get('/', auth, ctrl.listar);
router.get('/:id', auth, ctrl.obtener);
router.post('/', auth, requirePermisos('comprobantes:create'), ctrl.crear);
router.post('/importar-excel', auth, upload.single('archivo'), ctrl.importarExcel);
router.get('/:id/pdf', auth, ctrl.exportarPDF);
router.put('/:id', auth, requirePermisos('comprobantes:update'), ctrl.actualizar);
router.delete('/:id', auth, requirePermisos('comprobantes:anular'), ctrl.eliminar);
router.post('/:id/contabilizar', auth, requirePermisos('comprobantes:anular'), ctrl.contabilizar);

module.exports = router;
