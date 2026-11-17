// Run by the hosting's cron every 10 minutes (Hostinger: Cron Jobs ->
// Node.js -> scripts/cron.js). Asks the running app to do whatever
// background jobs are due (see utils/jobRunner.js), which also wakes the
// app if the host had paused it. The jobs run inside the app, not here, so
// they share its record of what already ran.
//
// Needs CRON_SECRET (same value as the app's) and CRON_URL, e.g.
// https://api.fitnesszone.ltd/api/cron/run — the host loads both from the
// app's environment variables.
const url = process.env.CRON_URL;
const key = process.env.CRON_SECRET;

if (!url || !key) {
  console.error("cron: CRON_URL and CRON_SECRET must be set");
  process.exit(1);
}

fetch(url, {
  method: "POST",
  headers: { "X-Cron-Key": key },
  signal: AbortSignal.timeout(110 * 1000),
})
  .then(async (res) => {
    const body = await res.text();
    console.log(`cron: ${res.status} ${body}`);
    if (!res.ok) process.exit(1);
  })
  .catch((err) => {
    console.error("cron: request failed:", err.message);
    process.exit(1);
  });
