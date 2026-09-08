const mongoose = require("mongoose");

// A one-off, admin-created payment link for negotiated deals that aren't
// one of the site's standard packages/prices — e.g. a custom quote agreed
// over WhatsApp. Not tied to a registered Client; just a name/contact.
const customInvoiceSchema = new mongoose.Schema(
  {
    invoice_number: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    // Always stored in INR — the site's base currency. currency_code /
    // amount_display capture what the client actually saw and typed, purely
    // for the slip and admin reporting.
    amount: {
      type: Number,
      required: true,
    },
    currency_code: {
      type: String,
      default: "INR",
    },
    amount_display: {
      type: Number,
      default: null,
    },
    client_name: {
      type: String,
      required: true,
      trim: true,
    },
    client_email: {
      type: String,
      trim: true,
      default: null,
    },
    client_phone: {
      type: String,
      trim: true,
      default: null,
    },
    status: {
      type: String,
      enum: ["pending", "paid"],
      default: "pending",
    },
    stripe_session_id: {
      type: String,
      default: null,
    },
    paid_at: {
      type: Date,
      default: null,
    },
    // A stamp of this invoice's real amount, derived server-side with a
    // secret key. Printed on the slip so an admin can look up the invoice
    // number and confirm a client's screenshot hasn't been edited — the
    // code only matches what's actually stored in the database, regardless
    // of what a tampered image shows.
    verification_code: {
      type: String,
      default: null,
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("CustomInvoice", customInvoiceSchema);
