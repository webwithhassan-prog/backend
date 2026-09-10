const mongoose = require("mongoose");

const ebookSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    pdf_url: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    banner_url: {
      type: String,
      default: null,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("EBook", ebookSchema);
