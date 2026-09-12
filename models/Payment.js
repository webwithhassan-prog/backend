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
    // "stripe" for the automated flow; "manual" for any bank/wallet
    // transfer verified by hand via manual_method_ref below — new payment
    // methods for new countries are added as ManualPaymentMethod documents
    // from the admin panel, never by extending this enum.
    gateway: {
      type: String,
      enum: ["stripe", "manual"],
      required: true,
    },
    manual_method_ref: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ManualPaymentMethod",
      default: null,
    },
    // Snapshot of the method's name at the time of purchase, so an old
    // Payment record still shows what was actually chosen even if that
    // method is later renamed or deleted from the admin panel.
    manual_method_name: {
      type: String,
      default: null,
    },
    // Only set for a manual (non-Stripe) payment — the admin who reviewed
    // and confirmed/rejected it via WhatsApp cross-checking, and when.
    verified_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    verified_at: {
      type: Date,
      default: null,
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
    // Groups the multiple Payment docs created by one manual package
    // purchase (a combo checkout creates one Payment per plan, same as
    // Stripe) so an admin confirming one confirms the whole purchase
    // together under a single invoice number. Unused for single-item
    // (ebook/course) manual payments or any Stripe payment.
    manual_batch_id: {
      type: String,
      default: null,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Payment", paymentSchema);
