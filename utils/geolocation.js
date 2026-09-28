// ip-api.com's free tier caps out at 45 requests/minute per calling IP — and
// Render's outbound IP is shared with other Render apps, so that budget is
// effectively shared with strangers too (confirmed live: lookups were coming
// back empty for real visitors, silently dropping everyone to INR). It's now
// only a last resort, behind two free, unlimited signals that need no
// third-party call at all. Successful lookups are cached per IP; failures
// aren't, so a transient error doesn't lock a visitor out for the full TTL.
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const ipCache = new Map(); // ip -> { result, fetchedAt }

const EMPTY = { country: null, country_code: null };

// IANA timezone (from the visitor's own browser) -> ISO country. Covers the
// markets this site actually sells to; anything unmapped just falls through
// to the IP lookup.
const TIMEZONE_TO_COUNTRY = {
  "Asia/Karachi": "PK",
  "Asia/Kolkata": "IN",
  "Asia/Calcutta": "IN",
  "Asia/Dubai": "AE",
  "Asia/Riyadh": "SA",
  "Asia/Qatar": "QA",
  "Asia/Kuwait": "KW",
  "Asia/Muscat": "OM",
  "Asia/Bahrain": "BH",
  "Asia/Dhaka": "BD",
  "Asia/Colombo": "LK",
  "Asia/Kathmandu": "NP",
  "Asia/Kuala_Lumpur": "MY",
  "Asia/Kuching": "MY",
  "Asia/Singapore": "SG",
  "Europe/London": "GB",
  "Europe/Dublin": "IE",
  "Europe/Berlin": "DE",
  "Europe/Paris": "FR",
  "Europe/Madrid": "ES",
  "Europe/Rome": "IT",
  "Europe/Amsterdam": "NL",
  "Europe/Brussels": "BE",
  "Europe/Vienna": "AT",
  "Europe/Lisbon": "PT",
  "Europe/Athens": "GR",
  "Europe/Helsinki": "FI",
  "Europe/Istanbul": "TR",
  "America/New_York": "US",
  "America/Chicago": "US",
  "America/Denver": "US",
  "America/Phoenix": "US",
  "America/Los_Angeles": "US",
  "America/Anchorage": "US",
  "America/Detroit": "US",
  "Pacific/Honolulu": "US",
  "America/Toronto": "CA",
  "America/Vancouver": "CA",
  "America/Edmonton": "CA",
  "America/Winnipeg": "CA",
  "America/Halifax": "CA",
  "America/Regina": "CA",
  "America/St_Johns": "CA",
  "Australia/Sydney": "AU",
  "Australia/Melbourne": "AU",
  "Australia/Brisbane": "AU",
  "Australia/Perth": "AU",
  "Australia/Adelaide": "AU",
  "Australia/Hobart": "AU",
  "Australia/Darwin": "AU",
  "Pacific/Auckland": "NZ",
  "Africa/Johannesburg": "ZA",
  "Africa/Cairo": "EG",
  "Africa/Lagos": "NG",
  "Africa/Nairobi": "KE",
};

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
const withName = (code) => {
  try {
    return { country: regionNames.of(code) || null, country_code: code };
  } catch {
    return { country: null, country_code: code };
  }
};

// "XX" (unknown) and "T1" (Tor) are Cloudflare's non-country placeholders.
const isCountryCode = (value) =>
  typeof value === "string" && /^[A-Z]{2}$/.test(value) && value !== "XX" && value !== "T1";

// Behind Render's Cloudflare edge, req.ip (derived from X-Forwarded-For)
// can resolve to an edge address rather than the visitor's; Cloudflare
// sets cf-connecting-ip to the real client address itself.
const clientIpOf = (req) =>
  req.headers["cf-connecting-ip"] || req.headers["true-client-ip"] || req.ip;

// Best-effort IP -> country via ip-api. Never throws.
const lookupCountryFromIp = async (ip) => {
  try {
    // Local/dev requests won't resolve to a real country.
    if (!ip || ip === "::1" || ip.startsWith("127.") || ip.startsWith("::ffff:127.")) {
      return EMPTY;
    }

    const cleanIp = ip.replace("::ffff:", "");

    const cached = ipCache.get(cleanIp);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      return cached.result;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(
      `http://ip-api.com/json/${cleanIp}?fields=status,country,countryCode`,
      { signal: controller.signal },
    );
    clearTimeout(timeout);

    const data = await res.json();
    if (data.status !== "success") return EMPTY;

    const result = { country: data.country || null, country_code: data.countryCode || null };

    // Cheap unbounded-growth guard for a long-running process — a full
    // LRU is overkill at this traffic scale.
    if (ipCache.size > 5000) ipCache.clear();
    ipCache.set(cleanIp, { result, fetchedAt: Date.now() });

    return result;
  } catch {
    return EMPTY;
  }
};

// Visitor country, cheapest reliable signal first: the edge network's own
// geo header, then the browser's timezone, then (only if neither is
// available) the rate-limited IP lookup. `source` says which one answered.
const detectCountry = async (req, { timeZone } = {}) => {
  const edgeCountry = String(
    req.headers["cf-ipcountry"] || req.headers["x-vercel-ip-country"] || "",
  ).toUpperCase();
  if (isCountryCode(edgeCountry)) {
    return { ...withName(edgeCountry), source: "edge" };
  }

  const tzCountry = typeof timeZone === "string" ? TIMEZONE_TO_COUNTRY[timeZone] : null;
  if (tzCountry) {
    return { ...withName(tzCountry), source: "timezone" };
  }

  const fromIp = await lookupCountryFromIp(clientIpOf(req));
  return { ...fromIp, source: fromIp.country_code ? "ip" : "none" };
};

module.exports = { lookupCountryFromIp, detectCountry, clientIpOf };
