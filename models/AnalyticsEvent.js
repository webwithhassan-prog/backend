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
// One document per page view, forever, made this the fastest-growing
// collection. The dashboard reports at most 90 days back; MongoDB now
// removes events older than 180 days on its own.
analyticsEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 180 * 24 * 60 * 60 });

module.exports = mongoose.model("AnalyticsEvent", analyticsEventSchema);
