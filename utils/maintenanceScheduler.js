const Payment = require("../models/Payment");
const Class = require("../models/Class");

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const ABANDONED_CHECKOUT_AGE_MS = 2 * ONE_DAY_MS;
const PAST_CLASS_RETENTION_MS = 90 * ONE_DAY_MS;

// Housekeeping for records that otherwise accumulate forever:
// - Card checkouts nobody finished. Stripe expires a Checkout Session within
//   24h, so a Stripe payment still pending after 48h can never complete.
//   Manual (bank/wallet) claims are never touched — those wait on an admin.
// - Class instances long past; nothing reads them after the fact.
const runMaintenance = async () => {
  const now = Date.now();

  const abandoned = await Payment.deleteMany({
    gateway: "stripe",
    status: "pending",
    createdAt: { $lt: new Date(now - ABANDONED_CHECKOUT_AGE_MS) },
  });

  const oldClasses = await Class.deleteMany({
    datetime: { $lt: new Date(now - PAST_CLASS_RETENTION_MS) },
  });

  return {
    abandonedCheckouts: abandoned.deletedCount,
    oldClasses: oldClasses.deletedCount,
  };
};

const startMaintenanceScheduler = () => {
  const run = () =>
    runMaintenance()
      .then(({ abandonedCheckouts, oldClasses }) => {
        if (abandonedCheckouts || oldClasses) {
          console.log(
            `Maintenance: removed ${abandonedCheckouts} abandoned checkouts, ${oldClasses} old classes`,
          );
        }
      })
      .catch((err) => console.error("Maintenance scheduler error:", err.message));

  run();
  setInterval(run, ONE_DAY_MS);
};

module.exports = { runMaintenance, startMaintenanceScheduler };
