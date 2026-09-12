const Settings = require("../models/Settings");

// Always exactly one settings document — created lazily on first read.
const getOrCreateSettings = async () => {
  let settings = await Settings.findOne();
  if (!settings) settings = await Settings.create({});
  return settings;
};

// @desc Public — every page that renders a WhatsApp link needs this.
// Deliberately returns only the WhatsApp fields — this document also
// holds the shared class Zoom link (see utils/zoomLinkRotation.js), which
// must never be exposed on a public, unauthenticated endpoint.
const getSettings = async (req, res) => {
  try {
    const settings = await getOrCreateSettings();
    res.json({
      whatsapp_general: settings.whatsapp_general,
      whatsapp_dietician: settings.whatsapp_dietician,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Admin — settings not safe to expose on the public endpoint above
// (currently just the manual-payment alert toggle; the Zoom fields have
// their own admin-only surface in the timetable controller).
const getAdminSettings = async (req, res) => {
  try {
    const settings = await getOrCreateSettings();
    res.json({
      manual_payment_alerts_enabled: settings.manual_payment_alerts_enabled,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Admin — update the site's WhatsApp numbers
const updateSettings = async (req, res) => {
  const { whatsapp_general, whatsapp_dietician, manual_payment_alerts_enabled } = req.body;

  try {
    const settings = await getOrCreateSettings();
    if (whatsapp_general !== undefined) {
      settings.whatsapp_general = whatsapp_general.replace(/[^\d]/g, "");
    }
    if (whatsapp_dietician !== undefined) {
      settings.whatsapp_dietician = whatsapp_dietician.replace(/[^\d]/g, "");
    }
    if (manual_payment_alerts_enabled !== undefined) {
      settings.manual_payment_alerts_enabled = manual_payment_alerts_enabled;
    }
    await settings.save();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getSettings, getAdminSettings, updateSettings, getOrCreateSettings };
