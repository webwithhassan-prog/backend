const { getInrExchangeRates } = require("./exchangeRates");

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

module.exports = { inrToGbpPence };
