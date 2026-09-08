const mongoose = require('mongoose');

const classSchema = new mongoose.Schema(
  {
    trainer_ref: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trainer',
      required: true,
    },
    type: {
      type: String,
      required: true,
      trim: true,
    },
    datetime: {
      type: Date,
      required: true,
    },
    // No cap by default — Zoom sessions here aren't attendance-limited.
    // Left as an optional override in case a specific session ever needs one.
    capacity: {
      type: Number,
      default: null,
    },
    status: {
      type: String,
      enum: ['scheduled', 'cancelled'],
      default: 'scheduled',
    },
    cancel_reason: {
      type: String,
      trim: true,
    },
    zoom_meeting_id: {
      type: String,
    },
    zoom_join_url: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Class', classSchema);