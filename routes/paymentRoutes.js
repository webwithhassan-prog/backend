const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');
const {
  createStripeCheckout,
  stripeWebhook,
  createEbookCheckout,
  createCourseCheckout,
  getCheckoutSessionDetails,
} = require('../controllers/paymentController');
const {
  initiateManualPayment,
  listPendingManualPayments,
  confirmManualPayment,
  rejectManualPayment,
} = require('../controllers/manualPaymentController');

router.post('/stripe/checkout', protect, createStripeCheckout);
router.post('/stripe/ebook-checkout', protect, createEbookCheckout);
router.post('/stripe/course-checkout', protect, createCourseCheckout);
router.get('/session/:sessionId', protect, getCheckoutSessionDetails);

router.post('/manual/initiate', protect, initiateManualPayment);
router.get('/manual/pending', protect, adminOnly, listPendingManualPayments);
router.put('/manual/:id/confirm', protect, adminOnly, confirmManualPayment);
router.put('/manual/:id/reject', protect, adminOnly, rejectManualPayment);

router.post('/stripe/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

module.exports = router;