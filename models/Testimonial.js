const mongoose = require("mongoose");

const testimonialSchema = new mongoose.Schema(
  {
    image_url: {
      type: String,
      required: true,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Testimonial", testimonialSchema);
