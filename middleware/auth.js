const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Client = require("../models/Client");

// The database (Mumbai) is a long way from the server (Oregon): every
// lookup costs about a quarter of a second. Every authenticated request
// used to look the user up again, so a dashboard paid that several times
// over. The result is kept for a minute per user; anything that changes
// whether someone may use the site (ban, unban, edit, password reset,
// delete) calls forgetSession() so it applies immediately.
const SESSION_TTL_MS = 60 * 1000;
const MAX_SESSIONS = 5000;
const sessions = new Map(); // userId -> { user, banned, expires }

const forgetSession = (userId) => {
  if (userId) sessions.delete(String(userId));
};

const loadSession = async (userId) => {
  const hit = sessions.get(userId);
  if (hit && hit.expires > Date.now()) return hit;

  const [user, client] = await Promise.all([
    User.findById(userId).select("_id email role").lean(),
    Client.findOne({ user_ref: userId }).select("banned").lean(),
  ]);
  const entry = { user, banned: !!client?.banned, expires: Date.now() + SESSION_TTL_MS };
  if (user) {
    if (sessions.size >= MAX_SESSIONS) sessions.clear();
    sessions.set(userId, entry);
  }
  return entry;
};

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const { user, banned } = await loadSession(String(decoded.id));

      req.user = user;
      if (!req.user) {
        return res.status(401).json({ message: "User not found" });
      }

      // A client's JWT can outlive an admin banning them mid-session, so
      // this is checked on every request, not just at login.
      if (req.user.role === "client" && banned) {
        return res.status(403).json({
          message: "This account has been banned. Contact support for help.",
          banned: true,
        });
      }

      next();
    } catch (err) {
      return res.status(401).json({ message: "Not authorized, token failed" });
    }
  } else {
    return res.status(401).json({ message: "Not authorized, no token" });
  }
};

// For endpoints reachable both logged-in and as a guest (checkout, manual
// payment claims). Populates req.user when a valid token is present,
// but — unlike protect — never rejects the request when it isn't; an
// invalid/expired token is just treated the same as no token at all.
const optionalAuth = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer")) return next();

  try {
    const decoded = jwt.verify(header.split(" ")[1], process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select("-password");
  } catch (err) {
    // Fall through as a guest.
  }
  next();
};

module.exports = { protect, optionalAuth, forgetSession };
