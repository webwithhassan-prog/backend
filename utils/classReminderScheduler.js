const Client = require("../models/Client");
const Class = require("../models/Class");
const { toPKTParts, startOfDayPKT, dateStringPKT } = require("./pktTime");
const { sendClassReminderPush } = require("../services/pushService");

// Overridable for testing (see plan verification steps) — production
// defaults to a once-a-day poll and a 7:00-7:15 AM PKT send window.
const POLL_MS = Number(process.env.CLASS_REMINDER_POLL_MS) || 10 * 60 * 1000;
const WINDOW_START_HOUR = Number(process.env.CLASS_REMINDER_WINDOW_START_HOUR ?? 7);
const WINDOW_END_HOUR = Number(process.env.CLASS_REMINDER_WINDOW_END_HOUR ?? 7);
const WINDOW_END_MINUTE = Number(process.env.CLASS_REMINDER_WINDOW_END_MINUTE ?? 15);

const isWithinReminderWindow = ({ hour, minute }) => {
  if (hour < WINDOW_START_HOUR || hour > WINDOW_END_HOUR) return false;
  if (hour === WINDOW_END_HOUR && minute > WINDOW_END_MINUTE) return false;
  return true;
};

// One push per day summarizing today's schedule, not one per class slot —
// clients don't reserve a specific slot (classes are broadcast-style, see
// the plan's Booking-model note), so per-class reminders would either be
// dead code or spam everyone ~11 times a day.
const runClassReminders = async () => {
  const nowParts = toPKTParts(new Date());
  if (!isWithinReminderWindow(nowParts)) return;

  const todayDateString = dateStringPKT(new Date());
  const clients = await Client.find({
    has_workout: true,
    status: "active",
    "push_subscriptions.0": { $exists: true },
    last_class_reminder_sent_date: { $ne: todayDateString },
  });
  if (clients.length === 0) return;

  const startOfToday = startOfDayPKT();
  const startOfTomorrow = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);
  const todaysClasses = await Class.find({
    status: "scheduled",
    datetime: { $gte: startOfToday, $lt: startOfTomorrow },
  });
  if (todaysClasses.length === 0) return;

  for (const client of clients) {
    try {
      await sendClassReminderPush(client, todaysClasses);
      client.last_class_reminder_sent_date = todayDateString;
      await client.save();
    } catch (err) {
      console.error(
        `Class reminder failed for client ${client._id}:`,
        err.message,
      );
    }
  }
};

const startClassReminderScheduler = () => {
  runClassReminders().catch((err) =>
    console.error("Class reminder scheduler error:", err.message),
  );
  setInterval(() => {
    runClassReminders().catch((err) =>
      console.error("Class reminder scheduler error:", err.message),
    );
  }, POLL_MS);
};

module.exports = { startClassReminderScheduler, runClassReminders };
