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
    payment_ref: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
    },
  },
  { timestamps: true },
);

salesLogSchema.index({ date: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

module.exports = mongoose.model("SalesLog", salesLogSchema);
