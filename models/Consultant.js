const mongoose = require("mongoose");

const consultantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    specialty: {
      type: String,
      enum: [
        "dietician",
        "gynecologist",
        "psychiatrist",
        "physiotherapist",
        "personal_trainer",
        "other",
      ],
      required: true,
    },
    fee: {
      type: Number,
    },
    photo_url: {
      type: String,
    },
    title: {
      type: String,
      trim: true,
    },
    years_experience: {
      type: Number,
    },
    session_duration: {
      type: String,
      trim: true,
    },
    max_clients_per_session: {
      type: Number,
    },
    bio: {
      type: String,
      trim: true,
    },
    banned: {
      type: Boolean,
      default: false,
    },
    ban_reason: {
      type: String,
      default: null,
    },
    schedule: [
      {
        day: {
          type: String,
          enum: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        },
        start_time: String,
        end_time: String,
      },
    ],
  },
  { timestamps: true },
);

module.exports = mongoose.model("Consultant", consultantSchema);
