const { getInrExchangeRates } = require("./exchangeRates");
const { roundForCurrency } = require("./currencyRounding");

// Fallback only — used if the live rate fetch fails and there's no cached
// rate at all. Everyday charges use the same live rate the site displays
// prices in, so what a client sees pre-checkout always matches what
// Stripe actually charges.
const FALLBACK_INR_TO_GBP_RATE = 0.0078;

// Stripe always settles in GBP for this account — converts the INR list
// price to pence (Stripe's smallest GBP unit, same 100-per-unit scale as
// USD cents).
const inrToGbpPence = async (inrAmount) => {
  const rates = await getInrExchangeRates();
  const rate = rates.GBP || FALLBACK_INR_TO_GBP_RATE;
  const gbpAmount = inrAmount * rate;
  return Math.round(gbpAmount * 100); // Stripe expects amount in pence
};

// What a Stripe Checkout line is charged in. Visitors shown prices in
// rupees are charged in rupees — UPI only appears for INR payments, and
// the amount matches the ₹ price they saw (whole rupees, as displayed).
// Everyone else is charged in GBP, as before.
const stripeAmountFor = async (inrAmount, currencyCode) =>
  currencyCode === "INR"
    ? { currency: "inr", unit_amount: roundForCurrency(inrAmount, "INR") * 100 }
    : { currency: "gbp", unit_amount: await inrToGbpPence(inrAmount) };

// The GBP value of a completed checkout, for sales totals and receipts
// (which are all in GBP). A GBP session is what Stripe charged; an INR one
// is converted at the same live rate the price was shown at.
const settledGbpFor = async (session, inrAmount) =>
  session.currency === "inr"
    ? (await inrToGbpPence(inrAmount)) / 100
    : session.amount_total / 100;

module.exports = { inrToGbpPence, stripeAmountFor, settledGbpFor };
