const mongoose = require("mongoose");

const premiumAddonSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      default: "Premium Consultation Add-on",
    },
    price: {
      type: Number,
      required: true,
      default: 1000, // placeholder — update from admin panel later
    },
    sessions_included: {
      type: Number,
      default: 1,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("PremiumAddon", premiumAddonSchema);
