const express = require('express');
const router = express.Router();
const controller = require('../controllers/dashboard.controller');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.get('/', controller.obtener);

module.exports = router;
