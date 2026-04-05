const express = require('express');
const router = express.Router();
const controller = require('../controllers/departments.controller');
const { verifyToken, isAdminOrVentas } = require('../middlewares/auth');

router.use(verifyToken);
router.use(isAdminOrVentas); // Or adjust permission check accordingly

router.get('/', controller.getAll);
router.get('/:id', controller.getById);
router.post('/', controller.create);
router.put('/:id', controller.update);
router.delete('/:id', controller.delete);

module.exports = router;
