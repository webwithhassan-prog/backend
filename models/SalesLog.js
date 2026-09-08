const mongoose = require("mongoose");

const salesLogSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    category: {
      type: String,
      enum: ["plan", "consultation", "package", "ebook", "course", "custom"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    // The actual amount charged via Stripe — always GBP, regardless of what
    // currency the client had displayed on-screen (the switcher is display
    // only; Stripe always settles in GBP). Records from before the GBP
    // switch hold a USD amount under this same field.
    amount_settled: {
      type: Number,
      default: null,
    },
    // The currency the client had selected at checkout, and the equivalent
    // amount in that currency — so admin sees each sale the way that
    // specific client actually saw it (e.g. a PKR-priced visit shows PKR).
    currency_code: {
      type: String,
      default: "INR",
    },
    amount_display: {
      type: Number,
      default: null,
    },
    payment_ref: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
    },
  },
  { timestamps: true },
);

salesLogSchema.index({ date: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

module.exports = mongoose.model("SalesLog", salesLogSchema);
