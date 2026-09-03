// Computes days_remaining live from access_expires_at, and auto-flips status
// to 'expired' if it's passed — instead of a stored number nothing counts down.
const attachComputedAccess = (clientDoc) => {
  const client = clientDoc.toObject ? clientDoc.toObject() : { ...clientDoc };

  if (!client.access_expires_at) {
    client.days_remaining = 0;
    return client;
  }

  const now = new Date();
  const expiresAt = new Date(client.access_expires_at);
  const msRemaining = expiresAt - now;
  const daysRemaining = Math.max(
    0,
    Math.ceil(msRemaining / (1000 * 60 * 60 * 24)),
  );

  client.days_remaining = daysRemaining;

  if (daysRemaining === 0 && client.status === "active") {
    client.status = "expired";
  }

  return client;
};

module.exports = { attachComputedAccess };
