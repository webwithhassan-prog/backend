const Review = require("../models/Review");
const Consultation = require("../models/Consultation");

// @desc Client leaves a review for a completed 1-on-1 session
const createReview = async (req, res) => {
  const { consultation_id, rating, comment } = req.body;

  try {
    if (!consultation_id || !rating) {
      return res
        .status(400)
        .json({ message: "consultation_id and rating are required" });
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    const consultation = await Consultation.findById(consultation_id);
    if (!consultation) {
      return res.status(404).json({ message: "Consultation not found" });
    }
    if (new Date(consultation.datetime) > new Date()) {
      return res
        .status(400)
        .json({ message: "You can only review a session after it's happened" });
    }

    const existing = await Review.findOne({ consultation_ref: consultation_id });
    if (existing) {
      return res
        .status(400)
        .json({ message: "You've already reviewed this session" });
    }

    const review = await Review.create({
      consultation_ref: consultation_id,
      client_ref: consultation.client_ref,
      consultant_ref: consultation.consultant_ref,
      rating,
      comment: comment || "",
    });

    res.status(201).json(review);
  } catch (err) {
    if (err.code === 11000) {
      return res
        .status(400)
        .json({ message: "You've already reviewed this session" });
    }
    res.status(500).json({ message: err.message });
  }
};

// @desc Public — reviews for a specific consultant
const getConsultantReviews = async (req, res) => {
  try {
    const reviews = await Review.find({
      consultant_ref: req.params.consultantId,
    })
      .populate("client_ref", "name")
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// @desc Admin — list every review, newest first
const getAllReviews = async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate("client_ref", "name")
      .populate("consultant_ref", "name specialty")
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { createReview, getConsultantReviews, getAllReviews };
