const crypto = require("crypto");

// Falls back to JWT_SECRET so this works without any new env var, but a
// dedicated RECEIPT_SECRET on Render keeps this independent of the auth
// secret — recommended, not required.
const SECRET = process.env.RECEIPT_SECRET || process.env.JWT_SECRET;

// Short code derived from a receipt's own visible fields (invoice number,
// total, paid date, recipient email). Recomputing it from what's printed
// on a receipt and comparing to the code shown on it proves nothing was
// edited after Fitness Zone generated it — a forged or amount-edited
// receipt won't produce a matching code, since the code isn't stored
// anywhere to copy, only derived from a secret the customer never sees.
const generateReceiptCode = ({ invoiceNumber, total, paidAt, clientEmail }) => {
  const dateOnly = new Date(paidAt).toISOString().slice(0, 10);
  const payload = `${invoiceNumber}|${total}|${dateOnly}|${String(clientEmail).toLowerCase().trim()}`;
  const hash = crypto
    .createHmac("sha256", SECRET)
    .update(payload)
    .digest("hex")
    .toUpperCase();
  return `${hash.slice(0, 4)}-${hash.slice(4, 8)}`;
};

const verifyReceiptCode = (code, fields) =>
  String(code).toUpperCase().trim() === generateReceiptCode(fields);

module.exports = { generateReceiptCode, verifyReceiptCode };
