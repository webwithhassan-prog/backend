const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');
const {
  getPublicClasses,
  getClasses,
  createClass,
  updateClass,
  deleteClass,
  cancelClass,
  restoreClass,
} = require('../controllers/classController');

router.get('/public', getPublicClasses);

router.get('/', protect, adminOnly, getClasses);
router.post('/', protect, adminOnly, createClass);
router.put('/:id', protect, adminOnly, updateClass);
router.delete('/:id', protect, adminOnly, deleteClass);
router.put('/:id/cancel', protect, adminOnly, cancelClass);
router.put('/:id/restore', protect, adminOnly, restoreClass);

module.exports = router;