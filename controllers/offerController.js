const Offer = require("../models/Offer");
const { liveOfferFilter } = require("../utils/offerDiscount");

// Only the fields an admin can set, checked; dates may be empty.
const offerFields = (body) => {
  const out = {};
  for (const k of ["title", "message", "cta_label", "cta_link", "applies_to", "active"]) {
    if (body[k] !== undefined) out[k] = body[k];
  }
  if (body.discount_percent !== undefined) out.discount_percent = Number(body.discount_percent) || 0;
  for (const k of ["starts_at", "ends_at"]) {
    if (body[k] === undefined) continue;
    if (body[k] === null || body[k] === "") {
      out[k] = null;
    } else {
      const d = new Date(body[k]);
      if (Number.isNaN(d.getTime())) throw new Error("Enter a valid date and time");
      out[k] = d;
    }
  }
  if (out.starts_at && out.ends_at && out.ends_at <= out.starts_at) {
    throw new Error("The end must be after the start");
  }
  return out;
};

// @desc Get currently active offers (public — shown as a popup on site load)
const getActiveOffers = async (req, res) => {
  try {
    const offers = await Offer.find(liveOfferFilter()).sort({
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
    let fields;
    try {
      fields = offerFields(req.body);
    } catch (e) {
      return res.status(400).json({ message: e.message });
    }
    const offer = await Offer.create(fields);
    res.status(201).json(offer);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Update an offer (edit content, or toggle active)
const updateOffer = async (req, res) => {
  try {
    let fields;
    try {
      fields = offerFields(req.body);
    } catch (e) {
      return res.status(400).json({ message: e.message });
    }
    if (fields.starts_at !== undefined || fields.ends_at !== undefined) {
      const current = await Offer.findById(req.params.id).select("starts_at ends_at");
      const start = fields.starts_at !== undefined ? fields.starts_at : current?.starts_at;
      const end = fields.ends_at !== undefined ? fields.ends_at : current?.ends_at;
      if (start && end && end <= start) {
        return res.status(400).json({ message: "The end must be after the start" });
      }
    }
    const offer = await Offer.findByIdAndUpdate(req.params.id, fields, {
      returnDocument: "after",
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
