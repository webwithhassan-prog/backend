const Settings = require("../models/Settings");

// Always exactly one settings document — created lazily on first read.
const getOrCreateSettings = async () => {
  let settings = await Settings.findOne();
  if (!settings) settings = await Settings.create({});
  return settings;
};

// @desc Public — every page that renders a WhatsApp link needs this
const getSettings = async (req, res) => {
  try {
    const settings = await getOrCreateSettings();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Admin — update the site's WhatsApp numbers
const updateSettings = async (req, res) => {
  const { whatsapp_general, whatsapp_dietician } = req.body;

  try {
    const settings = await getOrCreateSettings();
    if (whatsapp_general !== undefined) {
      settings.whatsapp_general = whatsapp_general.replace(/[^\d]/g, "");
    }
    if (whatsapp_dietician !== undefined) {
      settings.whatsapp_dietician = whatsapp_dietician.replace(/[^\d]/g, "");
    }
    await settings.save();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getSettings, updateSettings };
