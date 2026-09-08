// ip-api.com's free tier caps out at 45 requests/minute from our one server
// IP, shared across every visitor — easy to blow through with normal
// traffic (let alone repeated testing), causing a lookup that would
// otherwise succeed to fail for an arbitrary visitor. Caching successful
// results per IP means a visitor who reloads or browses multiple pages
// only ever costs one real lookup. Failures are deliberately NOT cached —
// a transient rate-limit/timeout shouldn't lock that visitor out of
// detection for the full TTL; they just retry on their next request.
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const ipCache = new Map(); // ip -> { result, fetchedAt }

// Best-effort IP → country lookup for tagging where a signup came from.
// Never throws — a failed/slow lookup should never block registration.
const lookupCountryFromIp = async (ip) => {
  try {
    // Local/dev requests won't resolve to a real country.
    if (!ip || ip === "::1" || ip.startsWith("127.") || ip.startsWith("::ffff:127.")) {
      return { country: null, country_code: null };
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
    if (data.status !== "success") return { country: null, country_code: null };

    const result = { country: data.country || null, country_code: data.countryCode || null };

    // Cheap unbounded-growth guard for a long-running process — a full
    // LRU is overkill at this traffic scale.
    if (ipCache.size > 5000) ipCache.clear();
    ipCache.set(cleanIp, { result, fetchedAt: Date.now() });

    return result;
  } catch (err) {
    return { country: null, country_code: null };
  }
};

module.exports = { lookupCountryFromIp };
