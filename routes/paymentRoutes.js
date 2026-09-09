const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  createStripeCheckout,
  stripeWebhook,
  createEbookCheckout,
  createCourseCheckout,
  getCheckoutSessionDetails,
} = require('../controllers/paymentController');

router.post('/stripe/checkout', protect, createStripeCheckout);
router.post('/stripe/ebook-checkout', protect, createEbookCheckout);
router.post('/stripe/course-checkout', protect, createCourseCheckout);
router.get('/session/:sessionId', protect, getCheckoutSessionDetails);

router.post('/stripe/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

module.exports = router;