const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const Client = require("../models/Client");
const { sendPasswordResetEmail } = require("../services/emailService");
const { detectCountry } = require("../utils/geolocation");

// Admin sessions carry real operational power (client bans, payments,
// content, settings), so they're kept short-lived — a stolen/forgotten
// admin token is only useful for 2 days instead of a full month. Clients
// get the longer-lived convenience of not having to log back in constantly,
// since a client token can't do anything an attacker would want.
const ADMIN_TOKEN_TTL = "2d";
const CLIENT_TOKEN_TTL = "30d";

const generateToken = (id, role) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: role === "admin" ? ADMIN_TOKEN_TTL : CLIENT_TOKEN_TTL,
  });
};

const MIN_PASSWORD_LENGTH = 6;
const isPasswordTooShort = (password) =>
  !password || password.length < MIN_PASSWORD_LENGTH;

// @desc Register a new client
const registerClient = async (req, res) => {
  const { email, password, name, phone_number } = req.body;

  try {
    if (isPasswordTooShort(password)) {
      return res.status(400).json({
        message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
      });
    }

    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanPhone = String(phone_number || "").trim();
    if (!cleanEmail || !String(name || "").trim() || !cleanPhone) {
      return res
        .status(400)
        .json({ message: "Name, email and WhatsApp number are required." });
    }

    // Checked before anything is created. Signup used to create the login
    // first and the client profile second; when the profile failed (most
    // often a WhatsApp number already registered) the login was left
    // behind with no profile, and a second signup attempt then hit "User
    // already exists" — so people logged in with the password from their
    // second try and got "incorrect password".
    const [existingUser, phoneTaken] = await Promise.all([
      User.findOne({ email: cleanEmail }),
      Client.exists({ phone_number: cleanPhone }),
    ]);
    if (existingUser) {
      const hasProfile =
        existingUser.role !== "client" ||
        (await Client.exists({ user_ref: existingUser._id }));
      if (hasProfile) {
        return res.status(400).json({
          message:
            'An account with this email already exists. Log in, or use "Forgot password?" to set a new password.',
        });
      }
      // A signup that never finished: nothing is attached to it (no
      // profile, purchases or payments), so start it again cleanly.
      await User.deleteOne({ _id: existingUser._id });
    }
    if (phoneTaken) {
      return res.status(400).json({
        message:
          'This WhatsApp number is already registered. Log in with it (you can use the number instead of your email), or use "Forgot password?".',
      });
    }

    const user = await User.create({
      email: cleanEmail,
      password,
      role: "client",
    });

    const { country, country_code } = await detectCountry(req, {
      timeZone: req.body.timezone,
    });

    let client;
    try {
      client = await Client.create({
        user_ref: user._id,
        name,
        phone_number: cleanPhone,
        status: "expired",
        days_remaining: 0,
        country,
        country_code,
      });
    } catch (err) {
      // Never leave a login without its profile.
      await User.deleteOne({ _id: user._id });
      if (err.code === 11000) {
        return res.status(400).json({
          message:
            'This WhatsApp number is already registered. Log in with it, or use "Forgot password?".',
        });
      }
      throw err;
    }

    res.status(201).json({
      _id: user._id,
      email: user.email,
      role: user.role,
      client_id: client._id,
      token: generateToken(user._id, user.role),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Login (admin or client)
// The account a login identifier points to: an email, or the phone number
// on the client's profile — many clients joined over WhatsApp and know
// their number better than the email they signed up with. A phone number
// matches with or without the country code or a leading 0
// ("03001234567" or "+92 300 1234567"), but only when exactly one client
// has it.
const findUserForLogin = async (identifier) => {
  if (!identifier) return null;
  if (identifier.includes("@")) {
    return User.findOne({ email: identifier.toLowerCase() });
  }
  const digits = identifier.replace(/\D/g, "").replace(/^0+/, "");
  if (digits.length < 9) return null;
  const candidates = await Client.find(
    { phone_number: { $regex: `${digits.slice(-9)}$` } },
    { phone_number: 1, user_ref: 1 },
  ).lean();
  const matches = candidates.filter((c) =>
    c.phone_number.replace(/\D/g, "").endsWith(digits),
  );
  if (matches.length !== 1) return null;
  return User.findOne({ _id: matches[0].user_ref, role: "client" });
};

// @desc Log in with email (or phone number) and password
const login = async (req, res) => {
  const identifier = String(req.body.email ?? "").trim();
  const password =
    typeof req.body.password === "string" ? req.body.password : "";

  try {
    const user = await findUserForLogin(identifier);

    // Phone keyboards and password autofill often add a space at the end;
    // try the password exactly as typed first, then without it.
    const trimmed = password.trim();
    const passwordMatches =
      user &&
      ((await user.matchPassword(password)) ||
        (trimmed !== password &&
          trimmed.length > 0 &&
          (await user.matchPassword(trimmed))));

    if (passwordMatches) {
      let client_id = null;
      if (user.role === "client") {
        const client = await Client.findOne({ user_ref: user._id });
        if (client?.banned) {
          return res.status(403).json({
            message: "This account has been banned. Contact support for help.",
            banned: true,
          });
        }
        if (!client) {
          return res.status(409).json({
            message:
              "Your sign-up didn't finish. Please sign up again with this email — it only takes a minute.",
            signup_incomplete: true,
          });
        }
        client_id = client._id;
      }

      res.json({
        _id: user._id,
        email: user.email,
        role: user.role,
        client_id,
        token: generateToken(user._id, user.role),
      });
    } else {
      res.status(401).json({
        message:
          "Incorrect email, phone number or password. Check for typos, or use \"Forgot password?\" to set a new password.",
      });
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

    if (isPasswordTooShort(newPassword)) {
      return res.status(400).json({
        message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
      });
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
  const email = String(req.body.email ?? "").trim().toLowerCase();

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
    // An hour: emails can take minutes to arrive and aren't always opened
    // straight away — 5 minutes was locking people out.
    user.resetPasswordExpires = Date.now() + 60 * 60 * 1000;
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

    if (isPasswordTooShort(password)) {
      return res.status(400).json({
        message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
      });
    }

    user.password = password;
    user.password_set = true;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    res.json({ message: "Password reset successfully. You can now log in." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Finish setting up a guest-checkout-created account: confirm/fix the
// phone number and choose a real password. Email is fixed at this point —
// it's the account's login identifier and was already fixed by whichever
// payment created it, so it's shown but not editable here. Auto-logs them
// in on success so they don't have to immediately re-enter what they just
// typed.
const completeAccountSetup = async (req, res) => {
  const { token, phone_number, password } = req.body;

  try {
    if (isPasswordTooShort(password)) {
      return res.status(400).json({
        message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
      });
    }
    if (!phone_number) {
      return res.status(400).json({ message: "Phone number is required" });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({
      accountSetupToken: hashedToken,
      accountSetupExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        message: "This setup link is invalid or has expired — use \"Forgot password\" on the login page instead.",
      });
    }

    const client = await Client.findOne({ user_ref: user._id });
    if (!client) return res.status(404).json({ message: "Client not found" });

    client.phone_number = phone_number;
    try {
      await client.save();
    } catch (err) {
      if (err.code === 11000) {
        return res.status(400).json({
          message: "That phone number is already registered to another account.",
        });
      }
      throw err;
    }

    user.password = password;
    user.password_set = true;
    user.accountSetupToken = null;
    user.accountSetupExpires = null;
    await user.save();

    res.json({
      _id: user._id,
      email: user.email,
      role: user.role,
      client_id: client._id,
      token: generateToken(user._id, user.role),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  registerClient,
  login,
  changePassword,
  forgotPassword,
  resetPassword,
  completeAccountSetup,
};
