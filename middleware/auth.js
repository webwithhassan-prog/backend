const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Client = require("../models/Client");

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      req.user = await User.findById(decoded.id).select("-password");
      if (!req.user) {
        return res.status(401).json({ message: "User not found" });
      }

      // A client's JWT can outlive an admin banning them mid-session, so
      // this is checked on every request, not just at login.
      if (req.user.role === "client") {
        const client = await Client.findOne({ user_ref: req.user._id }).select(
          "banned",
        );
        if (client?.banned) {
          return res.status(403).json({
            message: "This account has been banned. Contact support for help.",
            banned: true,
          });
        }
      }

      next();
    } catch (err) {
      return res.status(401).json({ message: "Not authorized, token failed" });
    }
  } else {
    return res.status(401).json({ message: "Not authorized, no token" });
  }
};

module.exports = { protect };
