const express = require('express');
const router = express.Router();
const multer = require('multer');
const controller = require('../controllers/clienteProveedor.controller');
const authMiddleware = require('../middleware/auth');
const empresaMiddleware = require('../middleware/empresa');

const upload = multer({ storage: multer.memoryStorage() });

router.use(authMiddleware);
router.use(empresaMiddleware);

router.get('/', controller.listar);
router.get('/:id', controller.obtener);
router.post('/', controller.crear);
router.post('/importar-csv', upload.single('archivo'), controller.importarCsv);
router.put('/:id', controller.actualizar);
router.delete('/:id', controller.eliminar);

module.exports = router;
