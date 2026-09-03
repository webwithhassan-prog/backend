// Approximate conversion rate — update periodically or replace with a live FX API later
const PKR_TO_USD_RATE = 1 / 277.5; // ~1 USD = ~277.5 PKR (as of Aug 2026)

const pkrToUsdCents = (pkrAmount) => {
  const usdAmount = pkrAmount * PKR_TO_USD_RATE;
  return Math.round(usdAmount * 100); // Stripe expects amount in cents
};

module.exports = { pkrToUsdCents };
