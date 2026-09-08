const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');
const {
  createApplication,
  getApplications,
  approveApplication,
  rejectApplication,
  deleteApplication,
} = require('../controllers/applicationController');

// Public route — anyone can apply
router.post('/', createApplication);

// Admin-only routes
router.get('/', protect, adminOnly, getApplications);
router.put('/:id/approve', protect, adminOnly, approveApplication);
router.put('/:id/reject', protect, adminOnly, rejectApplication);
router.delete('/:id', protect, adminOnly, deleteApplication);

module.exports = router;