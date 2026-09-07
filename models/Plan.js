const mongoose = require("mongoose");

const planSchema = new mongoose.Schema(
  {
    product_type: {
      type: String,
      enum: ["dietplan", "workout", "combo"],
      required: true,
    },
    duration_days: {
      type: Number,
      enum: [30, 90, 180],
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    diet_plans_included: {
      type: Number, // only relevant for 'dietplan' and 'combo' types
      default: null,
    },
    features: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Plan", planSchema);
