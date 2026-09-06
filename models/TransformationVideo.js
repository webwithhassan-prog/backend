const mongoose = require("mongoose");

const transformationVideoSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
    },
    youtube_link: {
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

module.exports = mongoose.model("TransformationVideo", transformationVideoSchema);
