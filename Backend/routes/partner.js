const express = require('express');
const router = express.Router();
const { getAll, getById, create, update, remove } = require('../controllers/partnerController');
const { protect, authorize } = require('../middleware/auth');

router.get('/', getAll);
router.get('/:id', getById);
router.post('/', protect, authorize('superadmin', 'moderator'), create);
router.put('/:id', protect, authorize('superadmin', 'moderator'), update);
router.delete('/:id', protect, authorize('superadmin', 'moderator'), remove);

module.exports = router;
