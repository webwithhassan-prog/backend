const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    client_ref: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },
    class_ref: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Class",
    },
    status: {
      type: String,
      enum: ["booked", "cancelled", "completed"],
      default: "booked",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Booking", bookingSchema);
