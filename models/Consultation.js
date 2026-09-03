const mongoose = require("mongoose");

const consultationSchema = new mongoose.Schema(
  {
    consultant_ref: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Consultant",
      required: true,
    },
    client_ref: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },
    datetime: {
      type: Date,
      required: true,
    },
    zoom_meeting_id: {
      type: String,
    },
    zoom_join_url: {
      type: String,
    },
    payment_ref: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Payment",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Consultation", consultationSchema);
