const ManualPaymentMethod = require("../models/ManualPaymentMethod");

// @desc Public — active manual payment methods for one country, used by
// the checkout page for whichever country was geo-detected for the client.
const getPublicMethodsForCountry = async (req, res) => {
  try {
    const countryCode = (req.query.country || "").toUpperCase();
    if (!countryCode) return res.json([]);
    const methods = await ManualPaymentMethod.find({
      country_code: countryCode,
      active: true,
    }).sort({ sort_order: 1, createdAt: 1 });
    res.json(methods);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Admin — every method, every country, including inactive ones
const getAllMethods = async (req, res) => {
  try {
    const methods = await ManualPaymentMethod.find().sort({
      country_code: 1,
      sort_order: 1,
      createdAt: 1,
    });
    res.json(methods);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Admin — add a new manual payment method for a country
const createMethod = async (req, res) => {
  try {
    const method = await ManualPaymentMethod.create(req.body);
    res.status(201).json(method);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Admin — edit a method (details, logo, active state, order)
const updateMethod = async (req, res) => {
  try {
    const method = await ManualPaymentMethod.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true },
    );
    if (!method) return res.status(404).json({ message: "Method not found" });
    res.json(method);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Admin — remove a method entirely
const deleteMethod = async (req, res) => {
  try {
    const method = await ManualPaymentMethod.findByIdAndDelete(req.params.id);
    if (!method) return res.status(404).json({ message: "Method not found" });
    res.json({ message: "Payment method removed" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getPublicMethodsForCountry,
  getAllMethods,
  createMethod,
  updateMethod,
  deleteMethod,
};
