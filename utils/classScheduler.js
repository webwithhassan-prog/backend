const { runRegeneration } = require("../controllers/timetableController");

// Keeps the rolling 7-day Class schedule topped up automatically, so admin
// never has to remember to click "Regenerate Schedule" — run daily by
// utils/jobRunner.js.
const logResult = ({ created, updated, removed }) => {
  if (created > 0 || updated > 0 || removed > 0) {
    console.log(
      `Class schedule auto-regenerated: ${created} created, ${updated} updated, ${removed || 0} stale removed`,
    );
  }
};

const runClassRegeneration = () => runRegeneration().then(logResult);

module.exports = { runClassRegeneration };
