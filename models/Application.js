const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema(
  {
    photo_url: {
      type: String,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
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
    years_experience: {
      type: Number,
    },
    session_duration: {
      type: String,
      trim: true,
    },
    available_days: {
      type: String,
      trim: true,
    },
    bio: {
      type: String,
      trim: true,
    },
    contact: {
      type: String,
      required: true,
      trim: true,
    },
    cv_link: {
      type: String,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    offer_terms: {
      type: String,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Application", applicationSchema);
