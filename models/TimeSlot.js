const mongoose = require('mongoose');

const timeSlotSchema = new mongoose.Schema(
  {
    trainer_ref: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trainer',
      required: true,
    },
    hour: {
      type: Number,
      required: true,
      min: 0,
      max: 23,
    },
    minute: {
      type: Number,
      required: true,
      min: 0,
      max: 59,
    },
    // One persistent Zoom link per slot, reused across every day's
    // generated class and rotated weekly (see utils/zoomLinkRotation.js).
    zoom_meeting_id: {
      type: String,
    },
    zoom_join_url: {
      type: String,
    },
    zoom_rotated_at: {
      type: Date,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('TimeSlot', timeSlotSchema);