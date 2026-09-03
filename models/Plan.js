const mongoose = require("mongoose");

const planSchema = new mongoose.Schema(
  {
    product_type: {
      type: String,
      enum: ["dietplan", "workout"],
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
      type: Number, // only relevant for 'dietplan' type
      default: null,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Plan", planSchema);
