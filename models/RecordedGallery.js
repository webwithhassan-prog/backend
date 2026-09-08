const mongoose = require("mongoose");

// Weekly session recordings (unlisted YouTube links) for workout/combo
// clients — separate from RecordedContent, which is a different library.
const recordedGallerySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    youtube_link: {
      type: String,
      required: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("RecordedGallery", recordedGallerySchema);
