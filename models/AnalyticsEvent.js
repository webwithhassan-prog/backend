const mongoose = require("mongoose");

const analyticsEventSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        "page_view",
        "checkout_started",
        "offer_popup_view",
        "offer_popup_click",
      ],
      required: true,
    },
    path: {
      type: String,
      default: "",
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true },
);

analyticsEventSchema.index({ type: 1, createdAt: -1 });

module.exports = mongoose.model("AnalyticsEvent", analyticsEventSchema);
