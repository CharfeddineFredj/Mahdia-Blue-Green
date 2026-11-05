const express = require('express');
const router = express.Router();
const {
  getResources,
  getResourceById,
  recordResourceClick,
  refreshResourcePreview,
  createResource,
  updateResource,
  deleteResource
} = require('../controllers/resourceController');
const { protect, isAdmin } = require('../middleware/auth');

router.get('/', getResources);
router.get('/:id', getResourceById);
router.post('/:id/click', recordResourceClick); // public : compte chaque téléchargement / ouverture
router.post('/:id/refresh-preview', protect, isAdmin, refreshResourcePreview);
router.post('/', protect, isAdmin, createResource);
router.put('/:id', protect, isAdmin, updateResource);
router.delete('/:id', protect, isAdmin, deleteResource);

module.exports = router;
