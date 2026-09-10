const mongoose = require("mongoose");

// A course is a purchasable group of unlisted-YouTube video lessons —
// the "group of videos" admin can build for E-Books & Courses.
const courseSchema = new mongoose.Schema(
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
    price: {
      type: Number,
      required: true,
    },
    banner_url: {
      type: String,
      default: null,
    },
    lessons: [
      {
        title: { type: String, required: true, trim: true },
        youtube_link: { type: String, required: true },
      },
    ],
  },
  { timestamps: true },
);

module.exports = mongoose.model("Course", courseSchema);
