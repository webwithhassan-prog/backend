// While an account is frozen (paused) or locked (banned) its days stop
// counting. frozen_at marks when the clock stopped; when the account is
// active again, every date that was still ahead is pushed out by the time
// spent frozen, so the client gets back exactly the days they missed.

// Stop the clock (no-op if it's already stopped).
const stopClock = (client) => {
  if (!client.frozen_at) client.frozen_at = new Date();
};

// Restart the clock: move the access end, each package's end and the diet
// plan cycle later by the frozen time. Returns the days given back.
const restartClock = (client) => {
  if (!client.frozen_at) return 0;
  const frozenAt = new Date(client.frozen_at);
  const pausedMs = Math.max(0, Date.now() - frozenAt.getTime());
  const later = (d) => new Date(new Date(d).getTime() + pausedMs);

  if (client.access_expires_at && new Date(client.access_expires_at) > frozenAt) {
    client.access_expires_at = later(client.access_expires_at);
  }
  for (const plan of client.active_plans || []) {
    if (plan.expires_at && new Date(plan.expires_at) > frozenAt) {
      plan.expires_at = later(plan.expires_at);
    }
  }
  // The next 15-day diet plan is due that much later too.
  if (client.last_dietplan_delivered_at) {
    client.last_dietplan_delivered_at = later(client.last_dietplan_delivered_at);
  }
  client.frozen_at = null;
  return Math.round(pausedMs / (24 * 60 * 60 * 1000));
};

module.exports = { stopClock, restartClock };
