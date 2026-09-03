const mongoose = require('mongoose');

const dailyLogSchema = new mongoose.Schema(
  {
    client_ref: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
      required: true,
    },
    date: {
      type: String, // stored as YYYY-MM-DD so one entry per client per day
      required: true,
    },
    steps: {
      type: Number,
      default: 0,
    },
    water_liters: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

dailyLogSchema.index({ client_ref: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('DailyLog', dailyLogSchema);