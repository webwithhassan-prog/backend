// Approximate conversion rate — update periodically or replace with a live FX API later
const INR_TO_USD_RATE = 1 / 88; // ~1 USD = ~88 INR (as of Sep 2026)

const inrToUsdCents = (inrAmount) => {
  const usdAmount = inrAmount * INR_TO_USD_RATE;
  return Math.round(usdAmount * 100); // Stripe expects amount in cents
};

module.exports = { inrToUsdCents };
