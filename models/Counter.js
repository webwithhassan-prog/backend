const mongoose = require("mongoose");

// Generic atomic auto-increment counter (e.g. for invoice numbering) —
// findOneAndUpdate with $inc is atomic in MongoDB, so concurrent requests
// never hand out the same number.
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

const Counter = mongoose.model("Counter", counterSchema);

const getNextSequence = async (name) => {
  const counter = await Counter.findByIdAndUpdate(
    name,
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  );
  return counter.seq;
};

// One shared, gapless sequence for every kind of sale (custom invoices,
// packages, e-books, courses, consultations) — real invoice numbers, so two
// receipts can never show the same one.
const getNextInvoiceNumber = async () => {
  const seq = await getNextSequence("invoice");
  return `INV-${String(seq).padStart(5, "0")}`;
};

module.exports = { Counter, getNextSequence, getNextInvoiceNumber };
