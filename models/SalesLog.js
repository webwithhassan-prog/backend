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
      enum: ["plan", "consultation", "package", "ebook"],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    // The actual amount charged via Stripe — always USD, regardless of what
    // currency the client had displayed on-screen (the switcher is display
    // only; Stripe always settles in USD).
    amount_usd: {
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
