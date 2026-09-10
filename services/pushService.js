const webpush = require("web-push");

// web-push throws immediately (crashing the process, since this runs at
// module load) if either key is missing — which they will be until the
// VAPID env vars are added to Render/Vercel. Guarding this keeps deploying
// this feature safe before that's done: push sends are silently skipped
// (logged once) rather than taking down the whole API.
const vapidConfigured = Boolean(
  process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY,
);

if (vapidConfigured) {
  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_CONTACT_EMAIL || "fitnesszoneofficial.uk26@gmail.com"}`,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );
} else {
  console.warn(
    "VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY not set — push notifications are disabled.",
  );
}

// Sends to every device a client has subscribed from. A 404/410 means the
// browser itself dropped that subscription (uninstalled, cleared data,
// permission revoked) — Web Push's normal way of saying "this one's dead" —
// so it's pruned from the client rather than retried.
const sendPushToClient = async (client, payload) => {
  if (!vapidConfigured || !client.push_subscriptions?.length) return;

  const body = JSON.stringify(payload);
  let changed = false;

  for (const sub of [...client.push_subscriptions]) {
    try {
      await webpush.sendNotification(sub, body);
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        client.push_subscriptions = client.push_subscriptions.filter(
          (s) => s.endpoint !== sub.endpoint,
        );
        changed = true;
      } else {
        console.error(
          `Push send failed for client ${client._id}:`,
          err.message,
        );
      }
    }
  }

  if (changed) await client.save();
};

const sendClassReminderPush = async (client, todaysClasses) => {
  const sorted = [...todaysClasses].sort(
    (a, b) => new Date(a.datetime) - new Date(b.datetime),
  );
  const firstTime = new Date(sorted[0].datetime).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Karachi",
  });
  const body =
    sorted.length === 1
      ? `Today's class is at ${firstTime}.`
      : `${sorted.length} classes today — first one at ${firstTime}.`;

  await sendPushToClient(client, {
    title: "Today's Classes",
    body,
    url: "/client#upcoming-classes",
  });
};

const sendCheckinReminderPush = async (client) => {
  await sendPushToClient(client, {
    title: "Check-in reminder",
    body: "It's been a week — log your progress check-in.",
    url: "/client#weekly-progress",
  });
};

module.exports = { sendClassReminderPush, sendCheckinReminderPush };
