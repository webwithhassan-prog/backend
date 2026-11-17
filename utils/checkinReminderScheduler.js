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
    // Mark as sent first, and only send if this run made the mark — two
    // runs at once (timer + cron) can't both remind the same client.
    const previous = client.last_checkin_reminder_sent_at ?? null;
    const sentAt = new Date();
    const { modifiedCount } = await Client.updateOne(
      { _id: client._id, last_checkin_reminder_sent_at: previous },
      { $set: { last_checkin_reminder_sent_at: sentAt } },
    );
    if (!modifiedCount) continue;
    try {
      await sendCheckinReminderPush(client);
    } catch (err) {
      // Unmark so the next run tries again.
      await Client.updateOne(
        { _id: client._id, last_checkin_reminder_sent_at: sentAt },
        { $set: { last_checkin_reminder_sent_at: previous } },
      );
      console.error(
        `Check-in reminder failed for client ${client._id}:`,
        err.message,
      );
    }
  }
};

module.exports = { runCheckinReminders };
