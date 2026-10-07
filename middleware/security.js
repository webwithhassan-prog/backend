const { rateLimit, ipKeyGenerator } = require("express-rate-limit");
const { clientIpOf } = require("../utils/geolocation");

// Keyed on the real visitor address, not req.ip — behind Render's
// Cloudflare edge, req.ip can be an edge-node address shared by many
// unrelated visitors, which would let one person's traffic exhaust
// everyone else's limit.
const baseOptions = {
  windowMs: 15 * 60 * 1000,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(clientIpOf(req)),
};

// Applied to login/signup/password-reset/account-setup — the endpoints an
// attacker would actually want to hammer (credential stuffing, account
// enumeration, spamming reset emails). A genuine user retrying a typo a few
// times never comes close to this.
const authLimiter = rateLimit({
  ...baseOptions,
  limit: 20,
  message: { message: "Too many attempts — please wait a few minutes and try again." },
});

// Applied to checkout/payment-claim creation, now that both are reachable
// without an account. Looser than authLimiter — a real shopper might start
// checkout several times (changing plans, retrying after a card decline).
const checkoutLimiter = rateLimit({
  ...baseOptions,
  limit: 30,
  message: { message: "Too many requests — please wait a few minutes and try again." },
});

// Applied to high-volume, low-sensitivity public endpoints (analytics
// pings, redirect-style links a client might click a few times) — just
// enough headroom to stop a scripted flood without affecting a real
// visitor browsing normally in one session.
const publicLimiter = rateLimit({
  ...baseOptions,
  limit: 300,
  message: { message: "Too many requests — please wait a few minutes and try again." },
});

// Applied to "Report an issue" — every report emails the admin, so a
// handful per visitor an hour is plenty; more is someone flooding the inbox.
const reportLimiter = rateLimit({
  ...baseOptions,
  windowMs: 60 * 60 * 1000,
  limit: 5,
  message: { message: "You've sent several reports already — please wait a while before sending another." },
});

// A hidden form field real users never see or fill (styled off-screen in
// the frontend), so anything non-empty here is almost certainly a bot
// filling every field it can find. Cheap first line of defense that needs
// no third-party service or API keys.
const rejectBots = (req, res, next) => {
  if (req.body && req.body.website) {
    return res.status(400).json({ message: "Invalid submission" });
  }
  next();
};

// Strips any key that looks like a MongoDB query operator ("$gt", "$where", …)
// or a dotted path ("a.b") out of user-supplied input, recursively. Without
// this, a field that's later used directly in a query filter (e.g.
// `Client.find({ name })`) would let a request body like
// `{ "name": { "$ne": null } }` widen that filter into matching every
// document instead of the literal string it was supposed to be — classic
// NoSQL injection. Applied globally, before any controller sees the data.
const stripMongoOperators = (value, depth = 0) => {
  if (!value || typeof value !== "object" || depth > 8) return;
  for (const key of Object.keys(value)) {
    if (key.startsWith("$") || key.includes(".")) {
      delete value[key];
      continue;
    }
    stripMongoOperators(value[key], depth + 1);
  }
};

const sanitizeMongoInput = (req, res, next) => {
  stripMongoOperators(req.body);
  stripMongoOperators(req.query);
  stripMongoOperators(req.params);
  next();
};

module.exports = {
  authLimiter,
  checkoutLimiter,
  reportLimiter,
  publicLimiter,
  rejectBots,
  sanitizeMongoInput,
};
