const mongoose = require("mongoose");

const heroBannerSchema = new mongoose.Schema(
  {
    image_url: {
      type: String,
      required: true,
    },
    eyebrow: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    desc: {
      type: String,
      required: true,
      trim: true,
    },
    cta_label: {
      type: String,
      required: true,
      trim: true,
    },
    cta_link: {
      type: String,
      required: true,
      trim: true,
    },
    order: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("HeroBanner", heroBannerSchema);
