const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    discount_percent: {
      type: Number,
      required: true,
      min: 1,
      max: 100,
    },
    applies_to: {
      type: String,
      enum: ["all", "dietplan", "workout"],
      default: "all",
    },
    max_uses: {
      type: Number,
      default: null, // null = unlimited
    },
    used_count: {
      type: Number,
      default: 0,
    },
    expires_at: {
      type: Date,
      default: null, // null = never expires
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Coupon", couponSchema);
