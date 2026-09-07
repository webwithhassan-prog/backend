// Best-effort IP → country lookup for tagging where a signup came from.
// Never throws — a failed/slow lookup should never block registration.
const lookupCountryFromIp = async (ip) => {
  try {
    // Local/dev requests won't resolve to a real country.
    if (!ip || ip === "::1" || ip.startsWith("127.") || ip.startsWith("::ffff:127.")) {
      return { country: null, country_code: null };
    }

    const cleanIp = ip.replace("::ffff:", "");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(
      `http://ip-api.com/json/${cleanIp}?fields=status,country,countryCode`,
      { signal: controller.signal },
    );
    clearTimeout(timeout);

    const data = await res.json();
    if (data.status !== "success") return { country: null, country_code: null };

    return { country: data.country || null, country_code: data.countryCode || null };
  } catch (err) {
    return { country: null, country_code: null };
  }
};

module.exports = { lookupCountryFromIp };
