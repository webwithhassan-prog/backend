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
      enum: ["all", "dietplan", "workout", "combo"],
      default: "all",
    },
    active: {
      type: Boolean,
      default: true,
    },
    // Limited-time window (e.g. a month-end sale for 2-3 days). Empty start
    // = from now; empty end = until turned off. Outside the window the offer
    // neither shows nor discounts anything.
    starts_at: {
      type: Date,
      default: null,
    },
    ends_at: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Offer", offerSchema);
