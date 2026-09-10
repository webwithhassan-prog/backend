const Client = require("../models/Client");
const { sendCheckinReminderPush } = require("../services/pushService");

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * ONE_DAY_MS;

// Ports the frontend's checkinDue rule (frontend/src/pages/client/Profile.jsx)
// server-side: overdue if never checked in, or last check-in was 7+ days
// ago. The second guard (last_checkin_reminder_sent_at) stops the daily poll
// from re-sending every single day once a client is overdue — a reminder is
// due again only after another 7 days have passed since the last one sent.
const runCheckinReminders = async () => {
  const sevenDaysAgo = new Date(Date.now() - SEVEN_DAYS_MS);

  const clients = await Client.find({
    has_dietplan: true,
    "push_subscriptions.0": { $exists: true },
    $or: [
      { last_progress_checkin: null },
      { last_progress_checkin: { $lte: sevenDaysAgo } },
    ],
    $and: [
      {
        $or: [
          { last_checkin_reminder_sent_at: null },
          { last_checkin_reminder_sent_at: { $lte: sevenDaysAgo } },
        ],
      },
    ],
  });

  for (const client of clients) {
    try {
      await sendCheckinReminderPush(client);
      client.last_checkin_reminder_sent_at = new Date();
      await client.save();
    } catch (err) {
      console.error(
        `Check-in reminder failed for client ${client._id}:`,
        err.message,
      );
    }
  }
};

const startCheckinReminderScheduler = () => {
  runCheckinReminders().catch((err) =>
    console.error("Check-in reminder scheduler error:", err.message),
  );
  setInterval(() => {
    runCheckinReminders().catch((err) =>
      console.error("Check-in reminder scheduler error:", err.message),
    );
  }, ONE_DAY_MS);
};

module.exports = { startCheckinReminderScheduler, runCheckinReminders };
