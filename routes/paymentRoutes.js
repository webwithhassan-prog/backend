const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');
const {
  createStripeCheckout,
  stripeWebhook,
  recordConsultationPayment,
  createEbookCheckout,
} = require('../controllers/paymentController');

router.post('/stripe/checkout', protect, createStripeCheckout);
router.post('/stripe/ebook-checkout', protect, createEbookCheckout);

router.post('/stripe/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

router.post('/consultation', protect, adminOnly, recordConsultationPayment);

module.exports = router;