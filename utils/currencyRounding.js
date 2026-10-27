// How prices are rounded for display in each currency. The website
// (frontend/src/utils/currencyRounding.js — keep the two identical) and
// the server use the same rule, so the price a client sees, the amount
// recorded for their payment and what the admin panel shows all match.
//  - PKR: prices of Rs 1,000 or more to the nearest 10 (Rs 3,793 → 3,790);
//    smaller amounts to the nearest rupee.
//  - INR: whole rupees.
//  - Everything else: whole units from 10 up; below 10 (e.g. a per-day
//    price in GBP) up to 2 decimals so the real cost isn't rounded away.
const roundForCurrency = (value, code) => {
  if (!Number.isFinite(value)) return value;
  if (code === "PKR") {
    return value >= 1000 ? Math.round(value / 10) * 10 : Math.round(value);
  }
  if (code === "INR" || !code) return Math.round(value);
  return value >= 10 ? Math.round(value) : Math.round(value * 100) / 100;
};

module.exports = { roundForCurrency };
