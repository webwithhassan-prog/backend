const PremiumAddon = require("../models/PremiumAddon");

// @desc Get the premium add-on (public — usually just one exists)
const getPublicPremiumAddon = async (req, res) => {
  try {
    const addon = await PremiumAddon.findOne();
    res.json(addon);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Get premium add-on (admin)
const getPremiumAddon = async (req, res) => {
  try {
    const addon = await PremiumAddon.findOne();
    res.json(addon);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Create the premium add-on (only needed once)
const createPremiumAddon = async (req, res) => {
  try {
    const addon = await PremiumAddon.create(req.body);
    res.status(201).json(addon);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Update the premium add-on (price, sessions included)
const updatePremiumAddon = async (req, res) => {
  try {
    const addon = await PremiumAddon.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      },
    );
    if (!addon)
      return res.status(404).json({ message: "Premium add-on not found" });
    res.json(addon);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getPublicPremiumAddon,
  getPremiumAddon,
  createPremiumAddon,
  updatePremiumAddon,
};
