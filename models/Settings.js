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
    // One shared Zoom link for every class, regardless of trainer or time —
    // matches the existing admin-shares-one-link-to-the-trainers-group
    // process. Rotated weekly (see utils/zoomLinkRotation.js).
    zoom_meeting_id: {
      type: String,
    },
    zoom_join_url: {
      type: String,
    },
    zoom_rotated_at: {
      type: Date,
    },
    // Lets the admin mute the "new manual payment" alert email without a
    // deploy — the sidebar badge and Profile notice keep working either way.
    manual_payment_alerts_enabled: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Settings", settingsSchema);
