const Consultation = require("../models/Consultation");

// @desc Get all consultations
const getConsultations = async (req, res) => {
  try {
    const consultations = await Consultation.find()
      .populate("consultant_ref", "name specialty")
      .populate("client_ref", "name phone_number");
    res.json(consultations);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Create a consultation slot/booking
const createConsultation = async (req, res) => {
  try {
    const consultation = await Consultation.create(req.body);
    res.status(201).json(consultation);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Update a consultation
const updateConsultation = async (req, res) => {
  try {
    const updated = await Consultation.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      },
    );
    if (!updated)
      return res.status(404).json({ message: "Consultation not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Delete a consultation
const deleteConsultation = async (req, res) => {
  try {
    const deleted = await Consultation.findByIdAndDelete(req.params.id);
    if (!deleted)
      return res.status(404).json({ message: "Consultation not found" });
    res.json({ message: "Consultation removed" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  getConsultations,
  createConsultation,
  updateConsultation,
  deleteConsultation,
};
