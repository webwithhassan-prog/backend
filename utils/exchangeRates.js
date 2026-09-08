// Live FX rates, base INR (all prices in the DB are stored in INR).
// Cached in memory since these rates only need to refresh a few times a day —
// no need to hit the API on every request.
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

let cache = { rates: null, fetchedAt: 0 };

// Covers every currency in currencyController's SELECTABLE_CURRENCIES list —
// if this fallback is ever missing one (e.g. a live API outage right after a
// server restart, before the first successful fetch), that currency just
// silently disappears from the switcher and country-based auto-detection
// for it quietly fails closed to INR instead of erroring. Approximate rates,
// refreshed periodically — precision doesn't matter here, availability does.
const FALLBACK_RATES = {
  INR: 1,
  PKR: 2.94,
  GBP: 0.0078,
  USD: 0.0106,
  AED: 0.0388,
  AUD: 0.0147,
  CAD: 0.0146,
  EUR: 0.0091,
  KWD: 0.0033,
  MYR: 0.0428,
  OMR: 0.0041,
  QAR: 0.0385,
  SAR: 0.0397,
};

const getInrExchangeRates = async () => {
  const isStale = Date.now() - cache.fetchedAt > CACHE_TTL_MS;
  if (cache.rates && !isStale) return cache.rates;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch("https://open.er-api.com/v6/latest/INR", {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const data = await res.json();
    if (data.result !== "success" || !data.rates) throw new Error("Bad FX response");

    cache = { rates: data.rates, fetchedAt: Date.now() };
    return data.rates;
  } catch (err) {
    // Fall back to the last good cache, or hardcoded approximations if we
    // have never successfully fetched — never let pricing display break.
    return cache.rates || FALLBACK_RATES;
  }
};

// Converts an INR amount to whatever currency code was selected at checkout
// (falls back to the rate at payment-completion time — the exact rate at
// the moment of purchase isn't stored, so this is a close approximation).
const convertFromInr = async (inrAmount, currencyCode) => {
  if (!currencyCode || currencyCode === "INR") {
    return Math.round(inrAmount * 100) / 100;
  }
  const rates = await getInrExchangeRates();
  const rate = rates[currencyCode];
  if (!rate) return Math.round(inrAmount * 100) / 100;
  return Math.round(inrAmount * rate * 100) / 100;
};

module.exports = { getInrExchangeRates, convertFromInr };
