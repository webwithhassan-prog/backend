// Live FX rates, base INR (all prices in the DB are stored in INR).
// Cached in memory since these rates only need to refresh a few times a day —
// no need to hit the API on every request.
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

let cache = { rates: null, fetchedAt: 0 };

const FALLBACK_RATES = { INR: 1, PKR: 3.3, GBP: 0.0091, USD: 0.011 };

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

module.exports = { getInrExchangeRates };
