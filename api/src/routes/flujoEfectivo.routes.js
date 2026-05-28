const express = require('express');
const router = express.Router();
const controller = require('../controllers/flujoEfectivo.controller');
const authMiddleware = require('../middleware/auth');
const empresaMiddleware = require('../middleware/empresa');

router.use(authMiddleware);
router.use(empresaMiddleware);

router.get('/', controller.flujoEfectivo);

module.exports = router;
