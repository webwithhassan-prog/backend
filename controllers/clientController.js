const crypto = require("crypto");
const Client = require("../models/Client");
const User = require("../models/User");
const { attachComputedAccess } = require("../utils/clientAccess");

// @desc Get all clients (Enrollments)
const getClients = async (req, res) => {
  try {
    const clients = await Client.find();
    res.json(clients.map(attachComputedAccess));
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
      { new: true },
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
      { new: true },
    );
    if (!client) return res.status(404).json({ message: "Client not found" });
    res.json(attachComputedAccess(client));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Extend a client's access by N days — adds to whichever is later:
// their current expiry, or today (so extending an already-expired client
// starts fresh from now, not from a date in the past)
const extendClient = async (req, res) => {
  const { days } = req.body;

  try {
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ message: "Client not found" });

    const now = new Date();
    const base =
      client.access_expires_at && new Date(client.access_expires_at) > now
        ? new Date(client.access_expires_at)
        : now;

    base.setDate(base.getDate() + Number(days));
    client.access_expires_at = base;
    client.status = "active";
    await client.save();

    res.json(attachComputedAccess(client));
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
      { new: true },
    );
    if (!client) return res.status(404).json({ message: "Client not found" });
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
      { new: true },
    );
    if (!client) return res.status(404).json({ message: "Client not found" });
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

module.exports = {
  getClients,
  createClient,
  getClientById,
  freezeClient,
  resumeClient,
  extendClient,
  banClient,
  unbanClient,
  deleteClient,
  togglePackages,
  deliverDietPlan,
  dismissDietplanNotification,
  recordProgressCheckin,
  completeOnboarding,
};
