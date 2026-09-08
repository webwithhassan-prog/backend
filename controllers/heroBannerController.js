const HeroBanner = require("../models/HeroBanner");

// @desc Get all hero banners, in display order (public + admin use the same list)
const getHeroBanners = async (req, res) => {
  try {
    const banners = await HeroBanner.find().sort({ order: 1, createdAt: 1 });
    res.json(banners);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Create a hero banner (admin)
const createHeroBanner = async (req, res) => {
  try {
    const banner = await HeroBanner.create(req.body);
    res.status(201).json(banner);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Update a hero banner (admin)
const updateHeroBanner = async (req, res) => {
  try {
    const banner = await HeroBanner.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!banner) return res.status(404).json({ message: "Banner not found" });
    res.json(banner);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Delete a hero banner (admin)
const deleteHeroBanner = async (req, res) => {
  try {
    const banner = await HeroBanner.findByIdAndDelete(req.params.id);
    if (!banner) return res.status(404).json({ message: "Banner not found" });
    res.json({ message: "Banner removed" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getHeroBanners,
  createHeroBanner,
  updateHeroBanner,
  deleteHeroBanner,
};
