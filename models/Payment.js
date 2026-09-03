const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    client_ref: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },
    plan_ref: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Plan",
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
    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },
    // For 1-on-1 consultation payments (10% platform commission)
    professional_ref: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Consultant",
    },
    commission_amount: {
      type: Number,
    },
    coupon_code: {
      type: String,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Payment", paymentSchema);
