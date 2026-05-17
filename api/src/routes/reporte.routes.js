const express = require('express');
const router = express.Router();
const reporteController = require('../controllers/reporte.controller');
const authMiddleware = require('../middleware/auth');
const { requirePermisos } = require('../middleware/roles');

router.use(authMiddleware);
router.use(requirePermisos('reportes:read'));

router.get('/libro-diario', reporteController.libroDiario);
router.get('/libro-mayor', reporteController.libroMayor);
router.get('/balance-general', reporteController.balanceGeneral);
router.get('/estado-resultados', reporteController.estadoResultados);
router.get('/evolucion-patrimonio', reporteController.evolucionPatrimonio);
router.get('/sumas-saldos', reporteController.sumasSaldos);

module.exports = router;
