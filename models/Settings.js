const mongoose = require("mongoose");

// A single global settings document — site-wide values an admin can edit
// without a code deploy. Numbers are stored digits-only (country code +
// number, no "+" or spaces) so they drop straight into a wa.me link.
const settingsSchema = new mongoose.Schema(
  {
    whatsapp_general: {
      type: String,
      default: "447462164602",
    },
    whatsapp_dietician: {
      type: String,
      default: "919220447415",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Settings", settingsSchema);
