const mongoose = require("mongoose");

// One weekly check-in's numbers, for the client's progress chart. Only the
// numbers are kept — the rest of the check-in form (photo, notes, sleep…)
// still goes to the dietitian as an image and is never stored.
const progressEntrySchema = new mongoose.Schema(
  {
    client_ref: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },
    // Pakistan-time calendar day (YYYY-MM-DD): a second check-in the same
    // day replaces the first.
    date: { type: String, required: true },
    weight_kg: { type: Number, min: 20, max: 400, default: null },
    starting_weight_kg: { type: Number, min: 20, max: 400, default: null },
    inch_loss: { type: Number, min: 0, max: 200, default: null },
  },
  { timestamps: true },
);

progressEntrySchema.index({ client_ref: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("ProgressEntry", progressEntrySchema);
