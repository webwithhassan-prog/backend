const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const Client = require("../models/Client");
const { sendPasswordResetEmail } = require("../services/emailService");
const { lookupCountryFromIp } = require("../utils/geolocation");

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });
};

// @desc Register a new client
const registerClient = async (req, res) => {
  const { email, password, name, phone_number } = req.body;

  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    const user = await User.create({ email, password, role: "client" });

    const { country, country_code } = await lookupCountryFromIp(req.ip);

    const client = await Client.create({
      user_ref: user._id,
      name,
      phone_number,
      status: "expired",
      days_remaining: 0,
      country,
      country_code,
    });

    res.status(201).json({
      _id: user._id,
      email: user.email,
      role: user.role,
      client_id: client._id,
      token: generateToken(user._id),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Login (admin or client)
const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      let client_id = null;
      if (user.role === "client") {
        const client = await Client.findOne({ user_ref: user._id });
        if (client?.banned) {
          return res.status(403).json({
            message: "This account has been banned. Contact support for help.",
            banned: true,
          });
        }
        client_id = client?._id || null;
      }

      res.json({
        _id: user._id,
        email: user.email,
        role: user.role,
        client_id,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: "Invalid email or password" });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Change password (logged-in user)
const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Request a password reset email
const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    // Always respond the same way, whether or not the email exists — avoids leaking which emails are registered
    if (!user) {
      return res.json({
        message: "If that email exists, a reset link has been sent.",
      });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 5 * 60 * 1000; // 5 minutes
    await user.save();

    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${rawToken}`;
    // Not awaited — the response is identical either way (never reveals
    // whether the send actually succeeded, by design), so there's no reason
    // to make the request wait on the SMTP round-trip. A slow/failing mail
    // server used to hang this endpoint for minutes before erroring out.
    sendPasswordResetEmail(user.email, resetUrl).catch((err) =>
      console.error("Failed to send password reset email:", err.message),
    );

    res.json({ message: "If that email exists, a reset link has been sent." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Reset password using a valid token
const resetPassword = async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  try {
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res
        .status(400)
        .json({ message: "Reset link is invalid or has expired" });
    }

    user.password = password;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    res.json({ message: "Password reset successfully. You can now log in." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// TEMPORARY — diagnosing a live email-delivery issue on Render. Remove once
// resolved. Gated on JWT_SECRET as a crude shared-secret check so it isn't
// wide open while it exists.
const debugTestEmail = async (req, res) => {
  if (req.query.key !== process.env.JWT_SECRET) {
    return res.status(404).json({ message: "Not found" });
  }
  try {
    await sendPasswordResetEmail(
      "hassan521ansari@gmail.com",
      "https://fitnesszone.ltd/reset-password/debugtoken",
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message, stack: err.stack });
  }
};

module.exports = {
  registerClient,
  login,
  changePassword,
  forgotPassword,
  resetPassword,
  debugTestEmail,
};
