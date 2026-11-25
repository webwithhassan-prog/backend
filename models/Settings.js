const mongoose = require("mongoose");

// A single global settings document — site-wide values an admin can edit
// without a code deploy. Numbers are stored digits-only (country code +
// number, no "+" or spaces) so they drop straight into a wa.me link.
// The dropdown's starting list; USD doubles as the general option for
// countries that have no currency of their own here.
const DEFAULT_CURRENCIES = [
  { code: "AED", label: "United Arab Emirates" },
  { code: "AUD", label: "Australia" },
  { code: "CAD", label: "Canada" },
  { code: "EUR", label: "Europe" },
  { code: "GBP", label: "United Kingdom" },
  { code: "INR", label: "India" },
  { code: "KWD", label: "Kuwait" },
  { code: "MYR", label: "Malaysia" },
  { code: "OMR", label: "Oman" },
  { code: "PKR", label: "Pakistan" },
  { code: "QAR", label: "Qatar" },
  { code: "SAR", label: "Saudi Arabia" },
  { code: "USD", label: "General (other countries) · USA" },
];

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
    // Safety switch: off = every class uses the shared link above (even
    // classes that have their own link saved); on = classes with their own
    // link use it. Turning it off is an instant fallback.
    use_class_zoom_links: {
      type: Boolean,
      default: false,
    },
    // Lets the admin mute the "new manual payment" alert email without a
    // deploy — the sidebar badge and Profile notice keep working either way.
    manual_payment_alerts_enabled: {
      type: Boolean,
      default: true,
    },
    // Currencies offered in the price dropdown, managed by the admin
    // (Settings → Currencies). Any code the exchange-rate feed knows works.
    currencies: {
      type: [
        {
          _id: false,
          code: { type: String, uppercase: true, trim: true, match: /^[A-Z]{3}$/ },
          label: { type: String, trim: true, maxlength: 60 },
        },
      ],
      default: () => DEFAULT_CURRENCIES.map((c) => ({ ...c })),
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Settings", settingsSchema);
module.exports.DEFAULT_CURRENCIES = DEFAULT_CURRENCIES;
