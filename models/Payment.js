const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    // Optional — a manually-created custom invoice (negotiated, off-menu
    // deal) may be paid by someone who isn't a registered Client at all.
    client_ref: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
    },
    plan_ref: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
    },
    ebook_ref: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "EBook",
    },
    course_ref: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
    },
    gateway: {
      type: String,
      enum: ["stripe", "easypaisa", "jazzcash"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    // The actual amount charged via Stripe (always GBP — the currency
    // switcher on the site is display-only, Stripe always settles in GBP),
    // set once the webhook confirms the payment completed. Records from
    // before the GBP switch hold a USD amount under this same field.
    amount_settled: {
      type: Number,
      default: null,
    },
    // The currency the client had selected in the site's currency switcher
    // at checkout time, and the equivalent amount in that currency — for
    // showing each sale the way that specific client actually saw it.
    currency_code: {
      type: String,
      default: "INR",
    },
    amount_display: {
      type: Number,
      default: null,
    },
    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },
    // Assigned once, from the shared "invoice" counter, when the webhook
    // confirms payment — real customer-facing invoice numbers, never reused.
    invoice_number: {
      type: String,
    },
    coupon_code: {
      type: String,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Payment", paymentSchema);
