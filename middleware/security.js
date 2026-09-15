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

module.exports = { authLimiter, checkoutLimiter, rejectBots };
