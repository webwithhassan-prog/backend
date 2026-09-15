const crypto = require("crypto");
const User = require("../models/User");
const Client = require("../models/Client");
const { sendAccountSetupEmail } = require("../services/emailService");
const { lookupCountryFromIp } = require("./geolocation");

const SETUP_TOKEN_TTL_MS = 48 * 60 * 60 * 1000; // 48 hours

// A guest who pays (or whose manual claim gets verified) before ever
// choosing a password still needs a real account to grant the purchase to.
// This creates one with an unguessable random password nobody is ever
// shown, then hands back a one-time setup link — same shape as the
// password-reset flow, just used to *start* an account instead of
// recovering one. Returns the existing account untouched if the email is
// already registered, so a returning customer never gets a duplicate.
const findOrCreateGuestAccount = async ({ name, phone, email, ip, itemLabel }) => {
  if (!email || !phone) {
    throw new Error("A guest account needs at least an email and phone number");
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    const client = await Client.findOne({ user_ref: existingUser._id });
    if (client) return { client, user: existingUser, isNew: false };
    // A User row with no matching Client is unexpected (e.g. an admin
    // account) — treat as "can't attach a purchase here" rather than
    // silently creating a second, orphaned Client for the same email.
    throw new Error("An account already exists for this email");
  }

  const rawToken = crypto.randomBytes(32).toString("hex");
  const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
  const randomPassword = crypto.randomBytes(24).toString("hex");

  const user = await User.create({
    email,
    password: randomPassword,
    role: "client",
    password_set: false,
    accountSetupToken: hashedToken,
    accountSetupExpires: Date.now() + SETUP_TOKEN_TTL_MS,
  });

  const { country, country_code } = await lookupCountryFromIp(ip);

  const client = await Client.create({
    user_ref: user._id,
    name: name || "New Client",
    phone_number: phone,
    status: "expired",
    country,
    country_code,
  });

  const setupUrl = `${process.env.CLIENT_URL}/complete-account/${rawToken}`;
  // Best-effort, same as every other transactional email here — the
  // inline form on the payment-success/claim-submitted page is the
  // primary path; this is the backup for a closed tab or a different
  // device.
  sendAccountSetupEmail(email, setupUrl, itemLabel).catch((err) =>
    console.error("Failed to send account setup email:", err.message),
  );

  return { client, user, isNew: true, rawToken };
};

module.exports = { findOrCreateGuestAccount };
