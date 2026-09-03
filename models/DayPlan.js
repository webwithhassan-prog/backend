const mongoose = require('mongoose');

const dayPlanSchema = new mongoose.Schema(
  {
    day_of_week: {
      type: Number, // 0 = Sunday ... 6 = Saturday
      required: true,
      unique: true,
      min: 0,
      max: 6,
    },
    type: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('DayPlan', dayPlanSchema);