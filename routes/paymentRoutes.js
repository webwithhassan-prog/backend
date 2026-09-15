const express = require('express');
const router = express.Router();
const { protect, optionalAuth } = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');
const { checkoutLimiter, rejectBots } = require('../middleware/security');
const {
  createStripeCheckout,
  stripeWebhook,
  createEbookCheckout,
  createCourseCheckout,
  getCheckoutSessionDetails,
} = require('../controllers/paymentController');
const {
  initiateManualPayment,
  getMyPendingManualPayments,
  listPendingManualPayments,
  confirmManualPayment,
  rejectManualPayment,
} = require('../controllers/manualPaymentController');

// optionalAuth, not protect — checkout and manual-payment claims are now
// reachable as a guest (the account gets created after payment/verification
// instead of before), but a logged-in caller's identity should still be
// picked up so their purchase attaches to their existing account.
router.post('/stripe/checkout', checkoutLimiter, optionalAuth, createStripeCheckout);
router.post('/stripe/ebook-checkout', checkoutLimiter, optionalAuth, createEbookCheckout);
router.post('/stripe/course-checkout', checkoutLimiter, optionalAuth, createCourseCheckout);
router.get('/session/:sessionId', optionalAuth, getCheckoutSessionDetails);

router.post('/manual/initiate', checkoutLimiter, optionalAuth, rejectBots, initiateManualPayment);
router.get('/manual/mine', protect, getMyPendingManualPayments);
router.get('/manual/pending', protect, adminOnly, listPendingManualPayments);
router.put('/manual/:id/confirm', protect, adminOnly, confirmManualPayment);
router.put('/manual/:id/reject', protect, adminOnly, rejectManualPayment);

router.post('/stripe/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

module.exports = router;