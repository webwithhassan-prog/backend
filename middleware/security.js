const rateLimit = require("express-rate-limit");

// Applied to login/signup/password-reset/account-setup — the endpoints an
// attacker would actually want to hammer (credential stuffing, account
// enumeration, spamming reset emails). Keyed by IP; a genuine user retrying
// a typo a few times never comes close to this.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts — please wait a few minutes and try again." },
});

// Applied to checkout/payment-claim creation, now that both are reachable
// without an account. Looser than authLimiter — a real shopper might start
// checkout several times (changing plans, retrying after a card decline).
const checkoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests — please wait a few minutes and try again." },
});

// Applied to high-volume, low-sensitivity public endpoints (analytics
// pings, redirect-style links a client might click a few times) — just
// enough headroom to stop a scripted flood without affecting a real
// visitor browsing normally in one session.
const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests — please wait a few minutes and try again." },
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
  publicLimiter,
  rejectBots,
  sanitizeMongoInput,
};
