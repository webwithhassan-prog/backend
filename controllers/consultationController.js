const Consultation = require("../models/Consultation");
const Review = require("../models/Review");

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

// @desc Get a specific client's own scheduled consultations, each flagged
// with whether it's already been reviewed
const getClientConsultations = async (req, res) => {
  try {
    const consultations = await Consultation.find({
      client_ref: req.params.clientId,
    })
      .populate("consultant_ref", "name specialty")
      .sort({ datetime: -1 });

    const reviewed = await Review.find({
      consultation_ref: { $in: consultations.map((c) => c._id) },
    }).select("consultation_ref");
    const reviewedIds = new Set(reviewed.map((r) => r.consultation_ref.toString()));

    const withReviewFlag = consultations.map((c) => ({
      ...c.toObject(),
      has_review: reviewedIds.has(c._id.toString()),
    }));

    res.json(withReviewFlag);
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
  getClientConsultations,
  createConsultation,
  updateConsultation,
  deleteConsultation,
};
