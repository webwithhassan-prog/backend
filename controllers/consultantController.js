const Consultant = require("../models/Consultant");

// @desc Get all consultants
const getConsultants = async (req, res) => {
  try {
    const consultants = await Consultant.find();
    res.json(consultants);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Create a consultant
const createConsultant = async (req, res) => {
  try {
    const consultant = await Consultant.create(req.body);
    res.status(201).json(consultant);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Update a consultant
const updateConsultant = async (req, res) => {
  try {
    const consultant = await Consultant.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      },
    );
    if (!consultant)
      return res.status(404).json({ message: "Consultant not found" });
    res.json(consultant);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Delete a consultant
const deleteConsultant = async (req, res) => {
  try {
    const consultant = await Consultant.findByIdAndDelete(req.params.id);
    if (!consultant)
      return res.status(404).json({ message: "Consultant not found" });
    res.json({ message: "Consultant removed" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
// @desc Get consultants (public — limited fields only)
getPublicConsultants = async (req, res) => {
  try {
    const consultants = await Consultant.find().select(
      "name specialty photo_url",
    );
    res.json(consultants);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getConsultants,
  createConsultant,
  getPublicConsultants,
  updateConsultant,
  deleteConsultant,
};
