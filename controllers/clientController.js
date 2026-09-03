const Client = require("../models/Client");
const PremiumAddon = require("../models/PremiumAddon");
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

// @desc Admin manually toggles which packages are active for a client (for
// non-Stripe / WhatsApp-era activations). Grants a default quota on first
// activation, and a default 30-day access window if none is set yet.
const togglePackages = async (req, res) => {
  const { has_dietplan, has_workout, has_premium } = req.body;

  try {
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).json({ message: "Client not found" });

    if (has_dietplan && !client.has_dietplan) {
      client.diet_plans_total += 2;
    }
    if (has_premium && !client.has_premium) {
      const addon = await PremiumAddon.findOne();
      client.premium_sessions_total += addon?.sessions_included || 1;
    }

    client.has_dietplan = has_dietplan;
    client.has_workout = has_workout;
    client.has_premium = has_premium;

    const anyPackageActive = has_dietplan || has_workout || has_premium;

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
    await client.save();

    res.json({
      diet_plans_used: client.diet_plans_used,
      diet_plans_total: client.diet_plans_total,
    });
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
  getClientById,
  freezeClient,
  resumeClient,
  extendClient,
  togglePackages,
  deliverDietPlan,
  recordProgressCheckin,
  completeOnboarding,
};
