const Client = require("../models/Client");
const Class = require("../models/Class");
const { toPKTParts } = require("./pktTime");
const { sendClassStartingPush } = require("../services/pushService");

const MINUTE = 60 * 1000;

// "Your class starts soon" ~10 minutes before a class — only to clients who
// tapped "Remind me" on that class time (class_alert_times), so nobody gets
// a notification for all eleven daily classes. Runs every few minutes from
// utils/jobRunner.js; the window (5-15 minutes ahead) is wide enough that a
// 10-minute cron never skips a class, and each class is claimed before
// sending so it's announced once even if two runs overlap.
const runClassStartingSoon = async () => {
  const now = Date.now();
  const upcoming = await Class.find({
    status: "scheduled",
    datetime: { $gt: new Date(now + 5 * MINUTE), $lte: new Date(now + 15 * MINUTE) },
    starting_soon_sent_at: null,
  });

  let sent = 0;
  for (const cls of upcoming) {
    const { modifiedCount } = await Class.updateOne(
      { _id: cls._id, starting_soon_sent_at: null },
      { $set: { starting_soon_sent_at: new Date() } },
    );
    if (!modifiedCount) continue;

    const { hour, minute } = toPKTParts(new Date(cls.datetime));
    const time = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    const clients = await Client.find({
      has_workout: true,
      status: "active",
      access_expires_at: { $gt: new Date() },
      class_alert_times: time,
      "push_subscriptions.0": { $exists: true },
    });
    for (const client of clients) {
      try {
        await sendClassStartingPush(client, cls);
        sent++;
      } catch (err) {
        console.error(`Starting-soon push failed for client ${client._id}:`, err.message);
      }
    }
  }
  if (sent > 0) console.log(`Class starting soon: ${sent} notification(s) sent`);
};

module.exports = { runClassStartingSoon };
