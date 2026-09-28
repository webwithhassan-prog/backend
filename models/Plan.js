const mongoose = require("mongoose");

const planSchema = new mongoose.Schema(
  {
    product_type: {
      type: String,
      enum: ["dietplan", "workout", "combo"],
      required: true,
    },
    // Any whole number of days the admin chooses — the packages page lists
    // whatever durations exist, so no fixed set lives here.
    duration_days: {
      type: Number,
      required: true,
      min: [1, "Duration must be at least 1 day"],
      max: [3650, "Duration can't be more than 3650 days"],
      validate: {
        validator: Number.isInteger,
        message: "Duration must be a whole number of days",
      },
    },
    price: {
      type: Number,
      required: true,
      min: [0, "Price can't be negative"],
    },
    diet_plans_included: {
      type: Number, // only relevant for 'dietplan' and 'combo' types
      default: null,
    },
    features: {
      type: [String],
      default: [],
    },
    // Shown with the "Most popular" badge on the packages page. When no
    // package of a type is flagged, the middle duration gets the badge.
    is_popular: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Plan", planSchema);
