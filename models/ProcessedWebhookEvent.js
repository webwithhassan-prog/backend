const mongoose = require("mongoose");

// One row per Stripe event already handled, so a re-delivered event (Stripe
// retries whenever it doesn't get a timely 2xx) is recognised and skipped
// instead of granting the purchase twice. Stripe only retries for ~3 days,
// so rows expire after 30.
const processedWebhookEventSchema = new mongoose.Schema({
  event_id: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now, expires: 30 * 24 * 60 * 60 },
});

module.exports = mongoose.model("ProcessedWebhookEvent", processedWebhookEventSchema);
