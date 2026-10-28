const crypto = require("crypto");
const Client = require("../models/Client");
const User = require("../models/User");
const { attachComputedAccess } = require("../utils/clientAccess");
const { forgetSession } = require("../middleware/auth");
const { countryFromPhone } = require("../utils/countryFromPhone");

// @desc Get all clients (Enrollments)
const getClients = async (req, res) => {
  try {
    const clients = await Client.find();
    const users = await User.find(
      { _id: { $in: clients.map((c) => c.user_ref) } },
      { email: 1 },
    ).lean();
    const emailByUser = new Map(users.map((u) => [u._id.toString(), u.email]));
    res.json(
      clients.map((c) => {
        const out = attachComputedAccess(c);
        // Older clients saved without a country show their number's.
        if (!out.country_code) Object.assign(out, countryFromPhone(out.phone_number));
        return { ...out, email: emailByUser.get(c.user_ref.toString()) || null };
      }),
    );
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Manually create a client (admin) — e.g. a walk-in / cash / WhatsApp
// signup. If no password is given, a random one is generated and returned
// once in the response so the admin can share it with the client.
const createClient = async (req, res) => {
  const { name, phone_number, email, password } = req.body;

  try {
    if (!name || !phone_number || !email) {
      return res
        .status(400)
        .json({ message: "Name, phone number, and email are required" });
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "A user with this email already exists" });
    }

    const generatedPassword = password || crypto.randomBytes(4).toString("hex");

    const user = await User.create({
      email,
      password: generatedPassword,
      role: "client",
    });

    const client = await Client.create({
      user_ref: user._id,
      name,
      phone_number,
      status: "expired",
      ...countryFromPhone(phone_number),
    });

    res.status(201).json({
      client: attachComputedAccess(client),
      generated_password: password ? undefined : generatedPassword,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Get single client — admin can view any; a client can only view their own
const getClientById = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ message: "Client not found" });

    if (
      req.user.role === "client" &&
      client.user_ref.toString() !== req.user._id.toString()
    ) {
      return res
        .status(403)
        .json({ message: "Not authorized to view this client" });
    }

    res.json(attachComputedAccess(client));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Freeze a client (pause access) — doesn't touch the expiry date itself
const freezeClient = async (req, res) => {
  try {
    const client = await Client.findByIdAndUpdate(
      req.params.id,
      { status: "paused" },
      { returnDocument: "after" },
    );
    if (!client) return res.status(404).json({ message: "Client not found" });
    res.json(attachComputedAccess(client));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Resume a frozen client
const resumeClient = async (req, res) => {
  try {
    const client = await Client.findByIdAndUpdate(
      req.params.id,
      { status: "active" },
      { returnDocument: "after" },
    );
    if (!client) return res.status(404).json({ message: "Client not found" });
    res.json(attachComputedAccess(client));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Add or deduct access days and/or diet plans. Positive numbers add,
// negative numbers deduct; either can be used alone. Added days count from
// whichever is later, the current expiry or today (so extending an expired
// client starts fresh from now); deducted days come off the current expiry.
// Diet plans are separate because access days don't refill the quota on
// their own — a client given 365 more days would otherwise still have only
// the 2 plans from their original package.
const extendClient = async (req, res) => {
  const days = Number(req.body.days || 0);
  const dietPlans = Number(req.body.diet_plans || 0);

  if (
    !Number.isInteger(days) ||
    !Number.isInteger(dietPlans) ||
    Math.abs(days) > 3650 ||
    Math.abs(dietPlans) > 250
  ) {
    return res
      .status(400)
      .json({ message: "Days and diet plans must be whole numbers." });
  }
  if (!days && !dietPlans) {
    return res
      .status(400)
      .json({ message: "Enter days or diet plans to add or deduct." });
  }

  try {
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ message: "Client not found" });

    if (dietPlans < 0 && client.diet_plans_total + dietPlans < client.diet_plans_used) {
      const unused = client.diet_plans_total - client.diet_plans_used;
      return res.status(400).json({
        message: `Only ${unused} unused diet plan${unused === 1 ? "" : "s"} left to deduct.`,
      });
    }
    if (days < 0 && !client.access_expires_at) {
      return res
        .status(400)
        .json({ message: "This client has no access days to deduct." });
    }

    const now = new Date();
    if (days > 0) {
      const base =
        client.access_expires_at && new Date(client.access_expires_at) > now
          ? new Date(client.access_expires_at)
          : now;
      base.setDate(base.getDate() + days);
      client.access_expires_at = base;
      client.status = "active";
    } else if (days < 0) {
      const expiry = new Date(client.access_expires_at);
      expiry.setDate(expiry.getDate() + days);
      client.access_expires_at = expiry;
      if (expiry <= now && client.status === "active") client.status = "expired";
    }

    if (dietPlans) {
      client.diet_plans_total += dietPlans;
      if (dietPlans > 0) {
        client.has_dietplan = true;
        // Same starting point the Dietplan checkbox sets, so the 15-day
        // auto-renewal has a date to count from.
        if (!client.last_dietplan_delivered_at) {
          client.last_dietplan_delivered_at = new Date();
        }
      }
    }

    await client.save();

    res.json(attachComputedAccess(client));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Admin edits a client's details. Only the fields sent are changed,
// and everything is checked before anything is saved.
const updateClient = async (req, res) => {
  const body = req.body || {};
  const fail = (message) => res.status(400).json({ message });

  try {
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ message: "Client not found" });
    const user = await User.findById(client.user_ref);

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) return fail("Name can't be empty.");
      client.name = name;
    }
    if (body.phone_number !== undefined) {
      const phone = String(body.phone_number).trim();
      if (!phone) return fail("Phone number can't be empty.");
      // A new number from another country moves the client's country too.
      const fromNewPhone = countryFromPhone(phone);
      if (
        phone !== client.phone_number &&
        fromNewPhone.country_code &&
        fromNewPhone.country_code !== countryFromPhone(client.phone_number).country_code
      ) {
        Object.assign(client, fromNewPhone);
      }
      client.phone_number = phone;
    }
    if (body.country !== undefined) {
      client.country = String(body.country || "").trim() || null;
    }
    if (body.status !== undefined) {
      if (!["active", "paused", "expired"].includes(body.status)) {
        return fail("Status must be active, paused or expired.");
      }
      client.status = body.status;
    }
    if (body.access_expires_at !== undefined) {
      if (!body.access_expires_at) {
        client.access_expires_at = null;
      } else {
        const date = new Date(body.access_expires_at);
        if (Number.isNaN(date.getTime())) return fail("Access end date isn't a valid date.");
        client.access_expires_at = date;
      }
    }
    for (const key of ["has_dietplan", "has_workout", "onboarding_completed"]) {
      if (body[key] !== undefined) client[key] = Boolean(body[key]);
    }
    for (const key of ["diet_plans_total", "diet_plans_used"]) {
      if (body[key] !== undefined) {
        const n = Number(body[key]);
        if (!Number.isInteger(n) || n < 0 || n > 1000) {
          return fail("Diet plan numbers must be whole numbers, 0 or more.");
        }
        client[key] = n;
      }
    }
    if (client.diet_plans_used > client.diet_plans_total) {
      return fail("Diet plans used can't be more than the total.");
    }
    if (client.has_dietplan && !client.last_dietplan_delivered_at) {
      client.last_dietplan_delivered_at = new Date();
    }

    if (body.email !== undefined && user) {
      const email = String(body.email).trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return fail("Enter a valid email address.");
      }
      if (email !== user.email) {
        const taken = await User.findOne({ email, _id: { $ne: user._id } });
        if (taken) return fail("Another account already uses this email.");
        user.email = email;
      }
    }

    try {
      await client.save();
      if (user?.isModified()) await user.save();
      forgetSession(client.user_ref);
    } catch (err) {
      if (err.code === 11000) {
        return fail(
          err.keyPattern?.email
            ? "Another account already uses this email."
            : "That phone number is already registered to another client.",
        );
      }
      throw err;
    }

    res.json({ ...attachComputedAccess(client), email: user?.email ?? null });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Admin sets a new random password for a client who can't log in.
// Returned once, for the admin to share — never stored in plain text.
const resetClientPassword = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ message: "Client not found" });
    const user = await User.findById(client.user_ref);
    if (!user) return res.status(404).json({ message: "Login account not found" });

    const password = crypto.randomBytes(4).toString("hex");
    user.password = password;
    user.password_set = true;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();
    forgetSession(user._id);

    res.json({ email: user.email, password });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Ban a client — blocks login and all API access, keeps their data intact
const banClient = async (req, res) => {
  const { reason } = req.body;

  try {
    const client = await Client.findByIdAndUpdate(
      req.params.id,
      { banned: true, ban_reason: reason || null },
      { returnDocument: "after" },
    );
    if (!client) return res.status(404).json({ message: "Client not found" });
    forgetSession(client.user_ref);
    res.json(attachComputedAccess(client));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Unban a client
const unbanClient = async (req, res) => {
  try {
    const client = await Client.findByIdAndUpdate(
      req.params.id,
      { banned: false, ban_reason: null },
      { returnDocument: "after" },
    );
    if (!client) return res.status(404).json({ message: "Client not found" });
    forgetSession(client.user_ref);
    res.json(attachComputedAccess(client));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Permanently delete a client — removes their account and login entirely.
// Payment/SalesLog history is kept for accounting records; only the client
// and their login user are removed.
const deleteClient = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ message: "Client not found" });
    forgetSession(client.user_ref);

    await User.findByIdAndDelete(client.user_ref);
    await client.deleteOne();

    res.json({ message: "Client deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Admin manually toggles which packages are active for a client (for
// non-Stripe / WhatsApp-era activations). Grants a default quota on first
// activation, and a default 30-day access window if none is set yet.
const togglePackages = async (req, res) => {
  const { has_dietplan, has_workout } = req.body;

  try {
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ message: "Client not found" });

    if (has_dietplan && !client.has_dietplan) {
      client.diet_plans_total += 2;
      if (!client.last_dietplan_delivered_at) {
        client.last_dietplan_delivered_at = new Date();
      }
    }

    client.has_dietplan = has_dietplan;
    client.has_workout = has_workout;

    const anyPackageActive = has_dietplan || has_workout;

    if (anyPackageActive && !client.access_expires_at) {
      const defaultExpiry = new Date();
      defaultExpiry.setDate(defaultExpiry.getDate() + 30);
      client.access_expires_at = defaultExpiry;
    }

    if (client.status !== "paused") {
      client.status = anyPackageActive ? "active" : "expired";
    }

    await client.save();
    res.json(attachComputedAccess(client));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Admin marks one diet plan as delivered — deducts from the client's quota
const deliverDietPlan = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ message: "Client not found" });

    if (client.diet_plans_used >= client.diet_plans_total) {
      return res
        .status(403)
        .json({ message: "No diet plans remaining for this client." });
    }

    client.diet_plans_used += 1;
    client.last_dietplan_delivered_at = new Date();
    await client.save();

    res.json({
      diet_plans_used: client.diet_plans_used,
      diet_plans_total: client.diet_plans_total,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Client dismisses the "time for your new dietplan" notification
const dismissDietplanNotification = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ message: "Client not found" });

    if (client.user_ref.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    client.dietplan_notification_pending = false;
    await client.save();

    res.json({ dietplan_notification_pending: false });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Client marks their weekly progress check-in as done (timestamp only — no answers stored)
const recordProgressCheckin = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ message: "Client not found" });

    if (client.user_ref.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    client.last_progress_checkin = new Date();
    await client.save();

    res.json({ last_progress_checkin: client.last_progress_checkin });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Client marks their one-time onboarding form as completed (flag only — no answers stored)
const completeOnboarding = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ message: "Client not found" });

    if (client.user_ref.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    client.onboarding_completed = true;
    await client.save();

    res.json({ onboarding_completed: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Client registers a browser/device for push notifications
const addPushSubscription = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ message: "Client not found" });

    if (client.user_ref.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const { subscription } = req.body;
    if (!subscription?.endpoint || !subscription?.keys) {
      return res.status(400).json({ message: "Invalid subscription" });
    }

    const alreadySubscribed = client.push_subscriptions.some(
      (s) => s.endpoint === subscription.endpoint,
    );
    if (!alreadySubscribed) {
      client.push_subscriptions.push({
        endpoint: subscription.endpoint,
        keys: subscription.keys,
      });
      await client.save();
    }

    res.json({ subscribed: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Client removes a browser/device's push subscription
const removePushSubscription = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ message: "Client not found" });

    if (client.user_ref.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const { endpoint } = req.body;
    client.push_subscriptions = client.push_subscriptions.filter(
      (s) => s.endpoint !== endpoint,
    );
    await client.save();

    res.json({ subscribed: false });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getClients,
  createClient,
  getClientById,
  freezeClient,
  resumeClient,
  extendClient,
  updateClient,
  resetClientPassword,
  banClient,
  unbanClient,
  deleteClient,
  togglePackages,
  deliverDietPlan,
  dismissDietplanNotification,
  recordProgressCheckin,
  completeOnboarding,
  addPushSubscription,
  removePushSubscription,
};
