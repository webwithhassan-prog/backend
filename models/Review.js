const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    consultation_ref: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Consultation",
      required: true,
      unique: true,
    },
    client_ref: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },
    consultant_ref: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Consultant",
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Review", reviewSchema);
