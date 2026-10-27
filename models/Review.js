const mongoose = require("mongoose");

// A client's review of Fitness Zone, written from their dashboard. One per
// client (editing it sends it back for approval); shown publicly only once
// an admin approves it.
const reviewSchema = new mongoose.Schema(
  {
    client_ref: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
      unique: true,
    },
    // How the client chose to be named publicly, e.g. "Amna K."
    display_name: {
      type: String,
      required: true,
      trim: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true },
);

reviewSchema.index({ status: 1, updatedAt: -1 });

module.exports = mongoose.model("Review", reviewSchema);
