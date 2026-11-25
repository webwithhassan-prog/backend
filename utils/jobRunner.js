const crypto = require("crypto");
const { runDietplanAutoDeduction } = require("./dietplanScheduler");
const { runClassRegeneration } = require("./classScheduler");
const { runClassReminders, POLL_MS } = require("./classReminderScheduler");
const { runCheckinReminders } = require("./checkinReminderScheduler");
const { runMaintenance } = require("./maintenanceScheduler");
const { runClassStartingSoon } = require("./classStartingSoonScheduler");

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const TICK_MS = 5 * 60 * 1000;

// Every background job, and how often it's due. Each job is safe to run
// again (it skips work already done), so a restart that runs everything
// once more is harmless.
const JOBS = [
  { name: "dietplanDeduction", everyMs: ONE_DAY_MS, run: runDietplanAutoDeduction },
  { name: "classSchedule", everyMs: ONE_DAY_MS, run: runClassRegeneration },
  { name: "classReminders", everyMs: POLL_MS, run: runClassReminders },
  // Runs on every tick: it only acts on classes starting 5-15 min ahead.
  { name: "classStartingSoon", everyMs: 0, run: runClassStartingSoon },
  { name: "checkinReminders", everyMs: ONE_DAY_MS, run: runCheckinReminders },
  { name: "maintenance", everyMs: ONE_DAY_MS, run: runMaintenance },
];

const lastRunAt = {};
let running = null;

// Runs whichever jobs are due, one at a time. Called by the in-process
// timer and by the hosting's cron (POST /api/cron/run) — hosts that stop
// long-running timers (Hostinger restarts the app on deploy and doesn't
// guarantee timers) still get every job on time through cron. Calls that
// arrive while a run is in progress share it instead of overlapping.
const runDueJobs = () => {
  if (running) return running;
  running = (async () => {
    const results = {};
    for (const job of JOBS) {
      const last = lastRunAt[job.name] || 0;
      // A minute's slack so a 10-minute cron isn't skipped for being early.
      if (Date.now() - last < job.everyMs - 60 * 1000) continue;
      try {
        await job.run();
        lastRunAt[job.name] = Date.now();
        results[job.name] = "ok";
      } catch (err) {
        console.error(`Job ${job.name} failed:`, err.message);
        results[job.name] = `error: ${err.message}`;
      }
    }
    return results;
  })().finally(() => {
    running = null;
  });
  return running;
};

const startJobRunner = () => {
  runDueJobs();
  setInterval(runDueJobs, TICK_MS);
};

// POST /api/cron/run — for the hosting's cron. Needs the CRON_SECRET
// environment variable, sent as the X-Cron-Key header; without the
// variable set, the endpoint doesn't exist.
const cronHandler = async (req, res) => {
  const secret = process.env.CRON_SECRET;
  const given = req.get("x-cron-key") || "";
  const ok =
    secret &&
    given.length === secret.length &&
    crypto.timingSafeEqual(Buffer.from(given), Buffer.from(secret));
  if (!ok) return res.status(404).json({ message: "Not found" });
  res.json({ ran: await runDueJobs() });
};

module.exports = { startJobRunner, runDueJobs, cronHandler };
