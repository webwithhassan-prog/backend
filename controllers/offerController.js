const Offer = require("../models/Offer");

// @desc Get currently active offers (public — shown as a popup on site load)
const getActiveOffers = async (req, res) => {
  try {
    const offers = await Offer.find({ active: true }).sort({
      createdAt: -1,
    });
    res.json(offers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Get all offers (admin)
const getOffers = async (req, res) => {
  try {
    const offers = await Offer.find().sort({ createdAt: -1 });
    res.json(offers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Create an offer
const createOffer = async (req, res) => {
  try {
    const offer = await Offer.create(req.body);
    res.status(201).json(offer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Update an offer (edit content, or toggle active)
const updateOffer = async (req, res) => {
  try {
    const offer = await Offer.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!offer) return res.status(404).json({ message: "Offer not found" });
    res.json(offer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Delete an offer
const deleteOffer = async (req, res) => {
  try {
    const offer = await Offer.findByIdAndDelete(req.params.id);
    if (!offer) return res.status(404).json({ message: "Offer not found" });
    res.json({ message: "Offer deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getActiveOffers,
  getOffers,
  createOffer,
  updateOffer,
  deleteOffer,
};
