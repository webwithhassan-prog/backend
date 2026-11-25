const mongoose = require('mongoose');

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6]; // 0 = Sunday ... 6 = Saturday

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
    // Days of the week this class runs on. Sundays only have one or two
    // classes, so most slots leave Sunday out; slots saved before this
    // existed have no list and run every day.
    days: {
      type: [{ type: Number, min: 0, max: 6 }],
      default: () => [...ALL_DAYS],
    },
    // This class's own Zoom link; empty means the shared link in Settings.
    // (Named differently from the zoom_join_url some old slot documents
    // still carry from before links moved to Settings, so those stale
    // links never come back into use.)
    class_zoom_url: {
      type: String,
      default: null,
      trim: true,
    },
  },
  { timestamps: true }
);

// The days a slot runs on, treating a missing/empty list as every day.
timeSlotSchema.statics.daysOf = (slot) =>
  Array.isArray(slot.days) && slot.days.length > 0 ? slot.days : ALL_DAYS;

module.exports = mongoose.model('TimeSlot', timeSlotSchema);
