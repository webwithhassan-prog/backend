const Client = require("../models/Client");

const FIFTEEN_DAYS_MS = 15 * 24 * 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// Auto-deducts one diet plan for every client whose last delivery was 15+
// days ago and who still has plans remaining in their quota. Flags the
// client for a "time for your new dietplan" notification on their dashboard.
const runDietplanAutoDeduction = async () => {
  const cutoff = new Date(Date.now() - FIFTEEN_DAYS_MS);

  const dueClients = await Client.find({
    has_dietplan: true,
    last_dietplan_delivered_at: { $ne: null, $lte: cutoff },
    $expr: { $lt: ["$diet_plans_used", "$diet_plans_total"] },
  });

  for (const client of dueClients) {
    client.diet_plans_used += 1;
    client.last_dietplan_delivered_at = new Date();
    client.dietplan_notification_pending = true;
    await client.save();
  }

  if (dueClients.length > 0) {
    console.log(
      `Dietplan auto-deduction: processed ${dueClients.length} client(s)`,
    );
  }
};

const startDietplanScheduler = () => {
  runDietplanAutoDeduction().catch((err) =>
    console.error("Dietplan scheduler error:", err.message),
  );
  setInterval(() => {
    runDietplanAutoDeduction().catch((err) =>
      console.error("Dietplan scheduler error:", err.message),
    );
  }, ONE_DAY_MS);
};

module.exports = { startDietplanScheduler, runDietplanAutoDeduction };
