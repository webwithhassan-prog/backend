const { runRegeneration } = require("../controllers/timetableController");

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// Keeps the rolling 7-day Class schedule topped up automatically, so admin
// never has to remember to click "Regenerate Schedule" — it runs once on
// boot and then once every 24 hours.
const logResult = ({ created, updated, removed }) => {
  if (created > 0 || updated > 0 || removed > 0) {
    console.log(
      `Class schedule auto-regenerated: ${created} created, ${updated} updated, ${removed || 0} stale removed`,
    );
  }
};

const startClassScheduler = () => {
  runRegeneration().then(logResult).catch((err) =>
    console.error("Class scheduler error:", err.message),
  );

  setInterval(() => {
    runRegeneration().then(logResult).catch((err) =>
      console.error("Class scheduler error:", err.message),
    );
  }, ONE_DAY_MS);
};

module.exports = { startClassScheduler };
