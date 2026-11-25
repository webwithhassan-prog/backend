const Client = require("../models/Client");

const FIFTEEN_DAYS_MS = 15 * 24 * 60 * 60 * 1000;

// Auto-deducts one diet plan for every client whose last delivery was 15+
// days ago and who still has plans remaining in their quota. Flags the
// client for a "time for your new dietplan" notification on their dashboard.
const runDietplanAutoDeduction = async () => {
  const cutoff = new Date(Date.now() - FIFTEEN_DAYS_MS);

  // Only while the plan runs: not after it expires, and not while the
  // account is frozen (frozen days don't count).
  const due = {
    has_dietplan: true,
    status: "active",
    access_expires_at: { $gt: new Date() },
    last_dietplan_delivered_at: { $ne: null, $lte: cutoff },
    $expr: { $lt: ["$diet_plans_used", "$diet_plans_total"] },
  };
  const dueClients = await Client.find(due).select("_id");

  // Each deduction re-checks "still due" as it writes, so two runs at once
  // (the app's timer and the hosting's cron) can't deduct a plan twice.
  let processed = 0;
  for (const { _id } of dueClients) {
    const { modifiedCount } = await Client.updateOne(
      { _id, ...due },
      {
        $inc: { diet_plans_used: 1 },
        $set: {
          last_dietplan_delivered_at: new Date(),
          dietplan_notification_pending: true,
        },
      },
    );
    processed += modifiedCount;
  }

  if (processed > 0) {
    console.log(`Dietplan auto-deduction: processed ${processed} client(s)`);
  }
};

module.exports = { runDietplanAutoDeduction };
