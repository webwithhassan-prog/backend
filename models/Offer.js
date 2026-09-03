const mongoose = require("mongoose");

const offerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    cta_label: {
      type: String,
      default: "View Offer",
    },
    cta_link: {
      type: String,
      default: "/plans",
    },
    discount_percent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    applies_to: {
      type: String,
      enum: ["all", "dietplan", "workout"],
      default: "all",
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Offer", offerSchema);
