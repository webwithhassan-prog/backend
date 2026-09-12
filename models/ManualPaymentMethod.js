const mongoose = require("mongoose");

// A single manual (non-Stripe) payment option shown to clients whose
// detected country matches `country_code` — e.g. "JazzCash" for PK, or
// "STC Pay" for SA. Fully admin-managed (see manualPaymentMethodController)
// so a new country or a new local bank/wallet is just an admin form, never
// a code deploy: adding Saudi National Bank later means creating one more
// of these documents with country_code "SA", not touching this schema.
const manualPaymentMethodSchema = new mongoose.Schema(
  {
    country_code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true, // ISO 3166-1 alpha-2, e.g. "PK", "SA" — matches the
      // country_code the IP-geolocation lookup already returns elsewhere.
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    logo_url: {
      type: String,
      default: null,
    },
    // Free-form label/value rows shown to the client for this method —
    // e.g. [{label:"Account Title", value:"Fitness Zone"}, {label:"Account
    // Number", value:"..."}, {label:"IBAN", value:"..."}] for a bank, or a
    // single row for a wallet number. Lets one schema cover any country's
    // very different "what a payer needs to see" shape.
    fields: [
      {
        label: { type: String, required: true, trim: true },
        value: { type: String, required: true, trim: true },
      },
    ],
    active: {
      type: Boolean,
      default: true,
    },
    sort_order: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("ManualPaymentMethod", manualPaymentMethodSchema);
