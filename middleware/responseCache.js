// Short-lived in-memory cache for public, admin-managed GET endpoints (plans,
// banners, testimonials, settings…). Every homepage visit used to cost ~20
// database queries for data that changes a few times a week; now repeat
// requests within the TTL are served from memory. Any successful write by an
// admin clears the whole cache, so admin edits still show up immediately;
// data written by background jobs is at most one TTL stale.
const DEFAULT_TTL_MS = 60 * 1000;
const MAX_ENTRIES = 500;

const cache = new Map(); // originalUrl -> { body, expires }

const cachePublic = (ttlMs = DEFAULT_TTL_MS) => (req, res, next) => {
  if (req.method !== "GET") return next();

  const key = req.originalUrl;
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) {
    res.set("X-Cache", "HIT");
    return res.json(hit.body);
  }

  const sendJson = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode === 200) {
      if (cache.size >= MAX_ENTRIES) cache.clear();
      cache.set(key, { body, expires: Date.now() + ttlMs });
    }
    res.set("X-Cache", "MISS");
    return sendJson(body);
  };
  next();
};

// Mounted app-wide. req.user is set by `protect` further down the chain, so
// it's checked once the response has finished.
const invalidateOnAdminWrite = (req, res, next) => {
  if (req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS") {
    return next();
  }
  res.on("finish", () => {
    if (res.statusCode < 400 && req.user?.role === "admin") cache.clear();
  });
  next();
};

module.exports = { cachePublic, invalidateOnAdminWrite };
